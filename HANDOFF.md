# Sudoku Lab 交接状态

更新时间：2026-08-01（Asia/Shanghai）

## 项目与生产环境

- 工作目录：`D:\ykl\助管\信息\0722\sudoku`
- 技术栈：Vue 3、Vue Router、Vite，纯前端静态站点
- GitHub 仓库：https://github.com/yang-kun-long/sudoku
- 正式域名：https://shudu.yang.team/
- 技巧页：https://shudu.yang.team/techniques
- 最新生产部署：`dpl_ELPid5LcnHGGAi46TQS5niTyucUH`
- 当前目录已初始化 `.git`，`main` 跟踪 `origin/main`
- Vercel CLI：`D:\Program Files\nodejs\node_global\vercel.cmd`
- 部署命令：`& 'D:\Program Files\nodejs\node_global\vercel.cmd' --prod --yes`
- Vercel 项目已通过 `vercel git connect https://github.com/yang-kun-long/sudoku` 连接 GitHub；后续 workflow 若提交 `main`，会触发 Vercel 自动部署

项目没有后端、数据库、云函数或远程求解 API。高级提示使用浏览器 Web Worker；题盘只在用户设备中计算，Worker 脚本和 HoDoKu 运行资源均从本站静态资源加载。

## 当前功能

- 五档难度，可选择混合题库、真人难度题库、NullSudoku 题库或本地生成
- 新增“地狱”难度入口；题目只从 `src/data/hell/verified.json` 抽取，题库为空时拒绝生成，避免给出后续依赖搜索的伪地狱题
- 支持手动录入题目，校验唯一解后开始解题
- 分享题目使用 URL hash 编码，点击分享只复制链接，不唤起系统分享面板；`d.` 表示内置题库，`p.` 表示普通题盘，`h.` 表示地狱题盘并会恢复地狱难度标签
- 浏览器本地保存题盘、候选、计时、主题和提示上下文
- 铅笔候选固定在 3x3 位置，数字 1 始终位于左上角
- 智能余数可反复切换：显示、隐藏、再次显示
- 填入正式数字时，自动移除同行、同列、同宫中的同数候选
- 长按下方数字可在当前格只保留该候选，并传播移除影响范围内的同数候选
- 铅笔模式下双击下方数字可直接填入正式数字
- 双击盘面数字可高亮所有相同数字的影响范围
- 数字按钮右上角显示当前已填写数量
- 支持撤销、擦除、检查、键盘输入、深色模式和移动端布局

## 提示架构

提示分为两层：

1. `src/logicalHint.js` 同步运行常用、可解释规则。
2. 第一层找不到结果时，`src/advancedHint.js` 调用 `src/hodoku.worker.js`，在浏览器后台线程运行 `hodoku-core-js`。

Worker 的请求超时为 60 秒。高级步骤会把 HoDoKu 的 `rYcX` 记号解析为棋盘高亮格，并将 `set` 或 `eliminate` 动作转为现有提示格式。候选消除会自动应用且支持撤销；确定值目前只高亮并说明，不会自动填入。

同步提示现有 17 种规则：

- Open/Naked/Hidden Single
- Naked/Hidden Pair
- Pointing、Claiming
- Naked/Hidden Triple
- X-Wing、Swordfish、Jellyfish
- Skyscraper、Two-String Kite
- Y-Wing、XYZ-Wing
- Junior Exocet（严格 Rule 1）

HoDoKu Core 暴露 111 个技巧与变体，包含唯一矩形、BUG+1、W-Wing、XY-Chain、AIC、分组链、完整鱼形家族、ALS、Death Blossom、Sue de Coq、模板法、强制链、强制网和 Brute Force。技巧页底部提供可搜索的完整目录。

用户已经明确取消此前“不提供反证法提示”的限制。现在允许强制链、分支和最终搜索作为兜底，不要恢复旧限制。

## 关键回归题

分享链接：

```text
https://shudu.yang.team/#share=p.ADAGCAAAEAIGAABwAEAJAIBgAwBAABBwIAAAMAAFAAAFAAYAmAAABQA
```

解码题盘：

```text
003006080
000100206
000070004
009008060
030040001
070200000
300005000
005000600
980000050
```

预期提示路径：

1. 智能余数开启后，第一次提示为 `Junior Exocet`。
2. 基格为 `r8c1`、`r8c2`，基数为 `{1,2,4,7}`。
3. 目标格 `r7c8` 排除 9，`r9c6` 排除 3。
4. 再次点击提示，HoDoKu 完整路径返回 `Brute Force`：`r5c7=9`。

Exocet 技巧动画显示三条交叉线（第 3、6、8 列）、伴随格 `r7c6`、`r9c8`、两个目标格以及术语解释。

## 主要文件

- `src/App.vue`：主棋盘、输入交互、候选、分享、保存和提示编排
- `src/sudoku.js`：生成、求解、唯一解、难度和分享编解码
- `src/sudoku.js`：生成、求解、唯一解、难度和分享编解码；地狱难度使用 verified 题库做数字/行列/宫带等价变换
- `src/data/hell/verified.json`：离线审题通过的人类可解地狱题库；当前为空，不能放入含 Brute Force / Give Up / Incomplete Solution 的题
- `scripts/generateHellPool.mjs`：离线铸题脚本，默认使用 `--source opening-search` 生成候选：随机完整解 + 唯一题挖洞 + clue swap 局部搜索，先优化开局低级技巧冻结，再用 HoDoKu 验证完整路径，合格后追加 JSON；仍可用 `--source hodoku` 回退到 HoDoKu 自带生成
- 另有实验候选源 `--source de-single`：从 HoDoKu 题出发做 targeted clue 删除/交换以消除开局 Single；当前较慢，20 次约 10 分钟且未命中，暂不作为 CI 默认源
- `scripts/generateHellPoolParallel.mjs`：本地并发铸题工具，启动多个 Node 子进程分片搜索，合并时去重并重新编号；推荐本地命令 `npm run hell:generate:parallel -- --attempts 2000 --target-additions 20 --workers 4 --source opening-search`
- `.github/workflows/generate-hell-pool.yml`：定时/手动铸题 workflow；公开仓库策略为每周二/周五各一次、1000 次候选、最多追加 10 题、脚本 50 分钟主动收尾、job 60 分钟硬超时，只有题库变化时才提交，避免空部署
- `src/logicalHint.js`：同步逻辑提示规则
- `src/logicalHint.test.js`：14 条逻辑回归测试
- `src/advancedHint.js`：Worker 生命周期、请求匹配和超时
- `src/hodoku.worker.js`：HoDoKu 调用、技巧翻译、记号坐标解析和提示标准化
- `src/views/TechniquesView.vue`：17 个专属动画、Exocet 术语动画和 111 项策略目录
- `vite.config.js`：必须排除 `hodoku-core-js` 依赖预优化，否则开发环境会把 TeaVM 资源解析成 HTML
- `vercel.json`：SPA 路由重写
- `THIRD_PARTY_NOTICES.md`：HoDoKu 第三方许可说明
- `public/HODOKU-GPL-3.0.txt`：随站点发布的完整 GPL 文本

## 验证状态

最近一次完成以下验证：

```powershell
npm test
npm run build
```

- 14/14 逻辑测试通过
- Vite 构建通过
- 375px 移动端技巧页无横向溢出
- 生产环境策略目录显示 111 项，搜索 `Forcing` 正常
- 生产环境高级 Worker 能在 Exocet 后返回 `r5c7=9`
- 生产环境控制台无错误
- `/HODOKU-GPL-3.0.txt` 返回 200
- 地狱难度已改为 verified 题库入口；当前题库为空时会提示先运行离线铸题脚本
- 最新生产环境 `/`、`/techniques`、`/HODOKU-GPL-3.0.txt` 返回 200
- GitHub Action 首次手动运行 `30686001548` 成功完成，1000 次候选未找到合格题，题库仍为空；第二次运行 `30686876446` 已触发并运行中

构建存在两个已知警告：

- `hodoku-core-js` 内部包含条件式 `node:fs/promises` 分支，Vite 会提示浏览器 externalize；浏览器实际走 `fetch` 分支，已在生产环境验证正常。
- `App` 产物约 2.35 MB（gzip 约 871 KB），主要因为题库静态打包；这是性能优化项，不影响当前功能。

## 已知边界与后续注意

- 111 项高级技巧已进入求解核心和目录，但只有原有 17 项拥有手工制作的专属动画。
- 高级步骤目前根据 HoDoKu 记号高亮相关格子，尚未为每种链自动绘制强链、弱链和箭头。
- 高级 Worker 尚无独立 Node 单元测试；当前通过生产构建后的 Playwright 浏览器流程验证。
- Worker 超时后不会强制终止正在运行的 TeaVM 任务，只会忽略迟到结果。若后续遇到卡住问题，应加入按请求重建 Worker 的取消机制。
- 应用自身代码为 MIT；`hodoku-core-js` 1.4.0 为 GPL-3.0-or-later。分发组合必须保留第三方声明、完整许可文本和上游源码链接。

## 用户偏好

- 必须保持纯前端，不新增后端服务
- 完成重要功能后部署到 Vercel 并验证正式域名
- 手机端保持紧凑，优先使用顶部空白，不让常用操作被挤到棋盘下方
- 分享操作只复制链接
- 候选数字位置必须稳定
- 提示需要说明思路并高亮范围；当前允许强制链和搜索兜底
