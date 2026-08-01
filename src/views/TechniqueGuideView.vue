<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getTechniqueGuide, groupedTechniqueGuides } from '../techniqueGuides'

const route = useRoute()
const isDark = ref(localStorage.getItem('sudoku-theme') === 'dark')
const guide = computed(() => getTechniqueGuide(route.params.id) || getTechniqueGuide('last-cell'))
const relatedGuides = computed(() => groupedTechniqueGuides
  .flatMap((group) => group.guides)
  .filter((item) => item.category === guide.value.category && item.id !== guide.value.id)
  .slice(0, 4))

function setTitle() {
  document.title = `${guide.value.label}教程 · Sudoku Lab`
}
function toggleTheme() {
  isDark.value = !isDark.value
  localStorage.setItem('sudoku-theme', isDark.value ? 'dark' : 'light')
}

watch(guide, setTitle)
watch(isDark, (value) => { document.body.classList.toggle('dark-page', value) }, { immediate: true })
onMounted(setTitle)
onUnmounted(() => { document.title = '数独 · Sudoku Lab' })
</script>

<template>
  <main class="guide-shell" :class="{ dark: isDark }">
    <header class="guide-header">
      <div>
        <p class="eyebrow">SUDOKU LAB</p>
        <h1>技巧教程</h1>
      </div>
      <div class="guide-actions">
        <RouterLink class="back-link" to="/techniques">技巧图解</RouterLink>
        <RouterLink class="back-link" to="/">返回棋盘</RouterLink>
        <button class="icon-button" type="button" title="切换主题" aria-label="切换主题" @click="toggleTheme">◐</button>
      </div>
    </header>

    <section class="guide-layout">
      <aside class="guide-nav" aria-label="技巧教程目录">
        <section v-for="group in groupedTechniqueGuides" :key="group.id">
          <h2>{{ group.label }}</h2>
          <RouterLink v-for="item in group.guides" :key="item.id" :to="`/techniques/${item.id}`" :class="{ active: item.id === guide.id }">
            <span>{{ item.label }}</span>
            <small>{{ item.level }}</small>
          </RouterLink>
        </section>
      </aside>

      <article class="guide-article">
        <div class="guide-meta">
          <span>{{ guide.level }}</span>
          <span>{{ guide.animated ? '有动画演示' : '文字教程' }}</span>
        </div>
        <h2>{{ guide.title }}</h2>
        <p class="guide-summary">{{ guide.summary }}</p>

        <section class="lesson-block">
          <h3>先记住一句话</h3>
          <p>{{ guide.rule }}</p>
        </section>

        <section class="lesson-block">
          <h3>怎么找</h3>
          <ol>
            <li v-for="step in guide.steps" :key="step">{{ step }}</li>
          </ol>
        </section>

        <section v-if="guide.example" class="lesson-block example-block">
          <h3>{{ guide.example.title }}</h3>
          <p>{{ guide.example.setup }}</p>
          <ol>
            <li v-for="step in guide.example.chain" :key="step">{{ step }}</li>
          </ol>
          <p class="example-conclusion">{{ guide.example.conclusion }}</p>
        </section>

        <section class="lesson-block">
          <h3>新手理解</h3>
          <p>{{ guide.noviceTip }}</p>
        </section>

        <section v-if="guide.pitfalls?.length" class="lesson-block">
          <h3>容易误判</h3>
          <ul>
            <li v-for="pitfall in guide.pitfalls" :key="pitfall">{{ pitfall }}</li>
          </ul>
        </section>

        <div class="article-links">
          <RouterLink v-if="guide.animated" :to="`/techniques#${guide.id}`">查看动画图解</RouterLink>
          <RouterLink v-for="item in relatedGuides" :key="item.id" :to="`/techniques/${item.id}`">{{ item.label }}</RouterLink>
        </div>
      </article>
    </section>
  </main>
</template>

<style scoped>
.guide-shell { width:min(1120px,calc(100% - 32px)); margin:0 auto; padding:36px 0 30px; color:var(--ink); }
.guide-header { display:flex; align-items:center; justify-content:space-between; gap:18px; margin-bottom:24px; }
.guide-header h1 { font-size:clamp(28px,4vw,38px); }
.guide-actions { display:flex; gap:8px; }
.back-link { min-height:40px; display:flex; align-items:center; padding:0 12px; border:1px solid var(--line); border-radius:7px; background:var(--surface); color:var(--ink); text-decoration:none; font-size:13px; font-weight:750; }
.icon-button { width:40px; height:40px; display:grid; place-items:center; padding:0; border:1px solid var(--line); border-radius:8px; background:var(--surface); color:var(--ink); font-size:20px; }
.guide-layout { display:grid; grid-template-columns:270px minmax(0,1fr); gap:34px; align-items:start; }
.guide-nav { position:sticky; top:18px; display:grid; gap:20px; padding-right:18px; border-right:1px solid var(--line); }
.guide-nav section { display:grid; gap:7px; }
.guide-nav h2 { margin:0 0 2px; color:var(--muted); font-size:11px; font-weight:800; letter-spacing:.08em; }
.guide-nav a { min-height:34px; display:flex; align-items:center; justify-content:space-between; gap:10px; padding:0 9px; border:1px solid transparent; border-radius:6px; color:var(--muted); text-decoration:none; font-size:13px; font-weight:700; }
.guide-nav a.active { border-color:var(--accent); background:var(--accent-soft); color:var(--accent); }
.guide-nav small { color:inherit; font-size:10px; font-weight:800; opacity:.72; }
.guide-article { max-width:740px; }
.guide-meta { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
.guide-meta span { min-height:24px; display:inline-flex; align-items:center; padding:0 8px; border:1px solid var(--line); border-radius:5px; color:var(--accent); font-size:11px; font-weight:800; }
.guide-article h2 { margin:0 0 14px; font-size:clamp(25px,3.5vw,38px); line-height:1.2; }
.guide-summary { margin:0 0 24px; color:var(--muted); font-size:16px; line-height:1.8; }
.lesson-block { padding:22px 0; border-top:1px solid var(--line); }
.lesson-block h3 { margin:0 0 10px; font-size:17px; }
.lesson-block p,.lesson-block li { color:var(--muted); font-size:14px; line-height:1.85; }
.lesson-block p { margin:0; }
.lesson-block ol,.lesson-block ul { margin:0; padding-left:22px; }
.lesson-block li { padding-left:4px; }
.example-block { background:linear-gradient(180deg,transparent,rgba(47,111,94,.05)); }
.example-block p+ol { margin-top:12px; }
.example-conclusion { margin-top:14px !important; padding:10px 12px; border-left:3px solid var(--accent); background:var(--accent-soft); color:var(--ink) !important; }
.article-links { display:flex; flex-wrap:wrap; gap:8px; padding-top:20px; border-top:1px solid var(--line); }
.article-links a { min-height:34px; display:inline-flex; align-items:center; padding:0 10px; border:1px solid var(--line); border-radius:6px; color:var(--accent); text-decoration:none; font-size:13px; font-weight:750; }
@media (hover:hover) { .guide-nav a:hover,.article-links a:hover,.back-link:hover { border-color:var(--accent); color:var(--accent); } }
@media (max-width:820px) { .guide-layout { grid-template-columns:1fr; } .guide-nav { position:static; grid-template-columns:repeat(2,minmax(0,1fr)); padding:0 0 20px; border-right:0; border-bottom:1px solid var(--line); } }
@media (max-width:520px) { .guide-shell { width:min(100% - 18px,1120px); padding-top:22px; } .guide-header { align-items:flex-start; flex-direction:column; gap:12px; } .guide-actions { width:100%; } .back-link { flex:1; justify-content:center; } .icon-button { flex:0 0 40px; } .guide-nav { grid-template-columns:1fr; } .guide-article h2 { font-size:24px; } }
</style>
