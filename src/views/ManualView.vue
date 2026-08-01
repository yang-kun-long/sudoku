<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'

const isDark = ref(localStorage.getItem('sudoku-theme') === 'dark')

const quickButtons = [
  { icon: '↗', name: '分享题目', detail: '复制当前题目的分享链接。手动录题时要先点“开始解题”，确认题目有效后才能分享。' },
  { icon: '✎', name: '铅笔', detail: '开启后，数字键会写入或取消候选数；再次点击关闭，数字键恢复为正式填数。' },
  { icon: '候', name: '智能余数', detail: '自动为所有空格填写当前合法候选数；再次点击会隐藏这些候选数。' },
  { icon: '⌫', name: '橡皮擦', detail: '清除当前选中格。题目给定数字不能被清除。' },
  { icon: '✦', name: '提示', detail: '分析当前盘面，标出下一步可执行的逻辑，并把本次提示写入提示记录。' },
  { icon: '↶', name: '撤销', detail: '撤回上一步填数、候选数或提示造成的盘面变化。' },
  { icon: '✓', name: '检查答案', detail: '检查已填写数字是否存在错误；不会直接公布答案。' },
]

const sourceRows = [
  ['混合题库', '从内置题库中抽题，适合日常练习。'],
  ['真人难度题库', '使用带有人类完成指标的数据集，难度更接近真人体验。'],
  ['NullSudoku 题库', '使用 NullSudoku 分级题库。'],
  ['本地生成', '在浏览器本地随机生成题目。'],
  ['手动输入题目', '把纸面题、截图题或别人给的题面录入网站，再开始解题。'],
]

const difficultyRows = [
  ['简单 / 中等 / 困难 / 专家', '网站自己的练习分类，用来控制抽题或生成题的目标难度。'],
  ['地狱', '从已验证的高分逻辑题库中取题，更偏进阶训练。'],
  ['HoDoKu评分', '独立的逻辑评分，只显示分数，不参与网站自己的难度名称显示。分数越高通常越难。'],
]

const inputRows = [
  ['点一个空格', '该格会高亮，同行、同列、同宫会以浅色提示，方便观察影响范围。'],
  ['按 1-9 或点数字键', '普通模式下会正式填入答案；如果填错，错误计数加 1，并把该格标红。'],
  ['Backspace / Delete / 清除', '清除当前格的用户填写内容。'],
  ['双击已出现的数字', '聚焦这个数字，棋盘会显示哪些格会被这个数字影响，方便扫盘。'],
  ['数字键右上角计数', '显示该数字当前已经出现几次，例如 3/9 表示盘面上已有三个 3。'],
]

function toggleTheme() {
  isDark.value = !isDark.value
  localStorage.setItem('sudoku-theme', isDark.value ? 'dark' : 'light')
}

function setTitle() {
  document.title = '操作手册 · Sudoku Lab'
}

watch(isDark, (value) => { document.body.classList.toggle('dark-page', value) }, { immediate: true })
onMounted(setTitle)
onUnmounted(() => { document.title = '数独 · Sudoku Lab' })
</script>

<template>
  <main class="manual-shell" :class="{ dark: isDark }">
    <header class="manual-header">
      <div>
        <p class="eyebrow">SUDOKU LAB</p>
        <h1>操作手册</h1>
      </div>
      <div class="manual-actions">
        <RouterLink class="back-link" to="/">返回棋盘</RouterLink>
        <RouterLink class="back-link" to="/techniques">技巧图解</RouterLink>
        <button class="icon-button" type="button" title="切换主题" aria-label="切换主题" @click="toggleTheme">◐</button>
      </div>
    </header>

    <section class="manual-intro">
      <div>
        <h2>先看完整界面</h2>
        <p>这个网站的核心流程是：选题、在棋盘上填写数字、必要时打开候选数、点提示学习下一步逻辑、用提示记录复盘。</p>
      </div>
      <nav class="manual-toc" aria-label="手册目录">
        <a href="#start">开始一局</a>
        <a href="#board">棋盘输入</a>
        <a href="#tools">顶部工具</a>
        <a href="#candidates">候选数</a>
        <a href="#hints">提示与记录</a>
        <a href="#manual-input">手动录题</a>
        <a href="#techniques">技巧教程</a>
      </nav>
    </section>

    <figure class="manual-figure">
      <img src="/manual/home-annotated.png" alt="数独练习主页操作区域标注图">
      <figcaption>主页由棋盘、顶部工具、数字键盘、开始一局和本局信息组成。</figcaption>
    </figure>

    <section id="start" class="manual-section">
      <h2>开始一局</h2>
      <div class="manual-two-col">
        <figure class="manual-figure compact">
          <img src="/manual/controls-annotated.png" alt="开始一局和本局信息区域标注图">
        </figure>
        <div class="manual-copy">
          <p>右侧的“开始一局”控制新题怎么来。先选题目来源，再选难度，最后点击主按钮开始。</p>
          <dl>
            <template v-for="row in sourceRows" :key="row[0]">
              <dt>{{ row[0] }}</dt>
              <dd>{{ row[1] }}</dd>
            </template>
          </dl>
          <dl>
            <template v-for="row in difficultyRows" :key="row[0]">
              <dt>{{ row[0] }}</dt>
              <dd>{{ row[1] }}</dd>
            </template>
          </dl>
        </div>
      </div>
    </section>

    <section id="board" class="manual-section">
      <h2>棋盘输入</h2>
      <p>深色大数字是题目给定数字，不能修改；绿色或空白格是你可以操作的格子。先点一个空格，再用底部数字键或键盘输入。</p>
      <div class="manual-list">
        <article v-for="row in inputRows" :key="row[0]">
          <h3>{{ row[0] }}</h3>
          <p>{{ row[1] }}</p>
        </article>
      </div>
    </section>

    <section id="tools" class="manual-section">
      <h2>顶部工具</h2>
      <p>桌面端工具在棋盘上方，手机端常用工具会移到标题旁边，含义一致。</p>
      <div class="button-grid">
        <article v-for="button in quickButtons" :key="button.name">
          <span class="button-icon">{{ button.icon }}</span>
          <div>
            <h3>{{ button.name }}</h3>
            <p>{{ button.detail }}</p>
          </div>
        </article>
      </div>
      <p class="manual-note">右上角“册”进入本手册，“?”进入数独技巧图解，“◐”切换浅色和深色主题。</p>
    </section>

    <section id="candidates" class="manual-section">
      <h2>候选数和铅笔模式</h2>
      <div class="manual-steps">
        <p><strong>智能余数：</strong>点击“候”后，网站会根据当前盘面给所有空格写入合法候选数。再点一次“候”，候选数会隐藏。</p>
        <p><strong>手动候选：</strong>点“✎”进入铅笔模式，选择格子后点 1-9，会把这个数字作为候选写进小格；再点同一个数字会取消。</p>
        <p><strong>铅笔模式下填正式答案：</strong>双击数字键，或者关闭铅笔模式后再点数字键。</p>
        <p><strong>长按数字键：</strong>当选中的空格已经有多个候选时，长按某个候选数字会只保留它，并把这个候选从相关格中排除，适合跟着提示复盘。</p>
      </div>
    </section>

    <section id="hints" class="manual-section">
      <h2>提示与提示记录</h2>
      <p>点“✦”后，网站会先找基础逻辑；如果基础逻辑找不到，会继续运行 HoDoKu 高级策略分析。提示不会直接把整题做完，只给当前盘面可执行的下一步。</p>
      <div class="manual-list">
        <article>
          <h3>提示面板</h3>
          <p>棋盘下方会出现“解题思路”，写明这一步用的技巧、涉及哪些格、应该填入或删除哪个候选。</p>
        </article>
        <article>
          <h3>技巧跳转</h3>
          <p>如果这一步对应教程，提示面板里会出现“本次方法：某某技巧”的链接，点击可跳到详细教程。</p>
        </article>
        <article>
          <h3>链式提示</h3>
          <p>遇到链、AIC、强制链时，棋盘会画箭头。实线表示强关系，虚线表示弱关系，下方还会把每个节点按顺序拆开。</p>
        </article>
        <article>
          <h3>提示记录</h3>
          <p>右侧“提示记录”会累计本局用了几次提示。展开后可以看到每次提示的时间、方法、结果、涉及格子和完整文字。</p>
        </article>
      </div>
    </section>

    <section id="manual-input" class="manual-section">
      <h2>手动录题</h2>
      <ol class="manual-ordered">
        <li>在“题目来源”里选择“手动输入题目”。</li>
        <li>棋盘进入录题状态，此时你点格子并输入的是题面数字，不是解题答案。</li>
        <li>录完题面后点“开始解题”。系统会检查题目是否无解或多解。</li>
        <li>只有唯一解的题目会进入正常解题模式，并开始计时、评分、提示记录。</li>
        <li>手动题也会计算 HoDoKu 分数。右侧显示“评分中”时表示后台还在算。</li>
      </ol>
    </section>

    <section id="techniques" class="manual-section">
      <h2>技巧图解和教程</h2>
      <figure class="manual-figure">
        <img src="/manual/techniques-annotated.png" alt="数独技巧图解页面标注图">
        <figcaption>技巧页可以看动画，也可以进入单项教程阅读更完整的文字解释。</figcaption>
      </figure>
      <div class="manual-list">
        <article>
          <h3>顶部技巧目录</h3>
          <p>技巧按初级、中级、高级、专家分组。点击任一按钮会切换到对应动画例子。</p>
        </article>
        <article>
          <h3>动画棋盘</h3>
          <p>高亮格表示推理用到的格子，红色删除标记表示要排除的候选。链类技巧会额外显示方向箭头。</p>
        </article>
        <article>
          <h3>文字解释</h3>
          <p>右侧会用具体行列和候选数字解释为什么这一步成立。底部“阅读新手教程”会进入更详细的单页教程。</p>
        </article>
      </div>
    </section>

    <section class="manual-section">
      <h2>手机使用</h2>
      <p>手机端仍然是同一套操作。常用工具会压缩到标题旁边，棋盘和侧栏会上下排列。点格子、点数字、开铅笔、看提示的方法不变。</p>
      <p class="manual-note">如果页面看起来太窄，优先竖屏使用；技巧动画页建议横屏查看更容易看清候选数和箭头。</p>
    </section>
  </main>
</template>

<style scoped>
.manual-shell { width:min(1120px,calc(100% - 32px)); margin:0 auto; padding:36px 0 34px; color:var(--ink); }
.manual-header { display:flex; align-items:center; justify-content:space-between; gap:18px; margin-bottom:24px; }
.manual-header h1 { font-size:clamp(28px,4vw,40px); }
.manual-actions { display:flex; gap:8px; }
.back-link { min-height:40px; display:flex; align-items:center; padding:0 12px; border:1px solid var(--line); border-radius:7px; background:var(--surface); color:var(--ink); text-decoration:none; font-size:13px; font-weight:750; }
.icon-button { width:40px; height:40px; display:grid; place-items:center; padding:0; border:1px solid var(--line); border-radius:8px; background:var(--surface); color:var(--ink); font-size:20px; }
.manual-intro { display:grid; grid-template-columns:minmax(0,1fr) 360px; gap:28px; align-items:end; padding-bottom:24px; border-bottom:1px solid var(--line); }
.manual-intro h2,.manual-section h2 { margin:0 0 10px; font-size:clamp(22px,3vw,30px); }
.manual-intro p,.manual-section p,.manual-section li,.manual-copy dd { color:var(--muted); font-size:14px; line-height:1.85; }
.manual-toc { display:flex; flex-wrap:wrap; gap:8px; justify-content:flex-end; }
.manual-toc a { min-height:32px; display:inline-flex; align-items:center; padding:0 10px; border:1px solid var(--line); border-radius:6px; color:var(--accent); text-decoration:none; font-size:13px; font-weight:750; }
.manual-figure { margin:24px 0 0; }
.manual-figure img { width:100%; display:block; border:1px solid var(--line); border-radius:8px; background:var(--surface); box-shadow:var(--shadow); }
.manual-figure figcaption { margin-top:9px; color:var(--muted); font-size:12px; line-height:1.6; text-align:center; }
.manual-section { padding:30px 0; border-bottom:1px solid var(--line); scroll-margin-top:18px; }
.manual-two-col { display:grid; grid-template-columns:340px minmax(0,1fr); gap:26px; align-items:start; }
.manual-two-col .manual-figure { margin:0; }
.manual-copy p { margin-top:0; }
.manual-copy dl { margin:16px 0 0; display:grid; gap:8px; }
.manual-copy dt { color:var(--ink); font-size:13px; font-weight:850; }
.manual-copy dd { margin:0; }
.manual-list { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-top:16px; }
.manual-list article,.button-grid article { min-width:0; padding:15px; border:1px solid var(--line); border-radius:8px; background:var(--surface); }
.manual-list h3,.button-grid h3 { margin:0 0 6px; font-size:15px; }
.manual-list p,.button-grid p { margin:0; }
.button-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-top:16px; }
.button-grid article { display:grid; grid-template-columns:42px minmax(0,1fr); gap:12px; align-items:start; }
.button-icon { width:38px; height:38px; display:grid; place-items:center; border:1px solid var(--line); border-radius:7px; color:var(--accent); background:var(--accent-soft); font-size:19px; font-weight:850; }
.manual-note { margin-top:16px !important; padding:10px 12px; border-left:3px solid var(--accent); background:var(--accent-soft); color:var(--ink) !important; }
.manual-steps { display:grid; gap:10px; margin-top:14px; }
.manual-steps p { margin:0; }
.manual-ordered { margin:12px 0 0; padding-left:22px; }
.manual-ordered li { padding-left:4px; margin-top:7px; }
@media (hover:hover) { .back-link:hover,.manual-toc a:hover { border-color:var(--accent); color:var(--accent); } }
@media (max-width:840px) {
  .manual-intro,.manual-two-col { grid-template-columns:1fr; }
  .manual-toc { justify-content:flex-start; }
  .manual-two-col .compact { max-width:380px; }
}
@media (max-width:560px) {
  .manual-shell { width:min(100% - 18px,1120px); padding-top:22px; }
  .manual-header { align-items:flex-start; flex-direction:column; gap:12px; }
  .manual-actions { width:100%; }
  .back-link { flex:1; justify-content:center; }
  .icon-button { flex:0 0 40px; }
  .manual-list,.button-grid { grid-template-columns:1fr; }
}
</style>
