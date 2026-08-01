# 数独练习

一个不需要后端的 Vue 3 + Vite 数独网页。题目在浏览器中实时生成，并通过唯一解检测和候选数评分进行分级。

当前生产状态、架构说明和下一次对话所需上下文见 [HANDOFF.md](./HANDOFF.md)。

## 运行

安装依赖后运行 `npm run dev`，也可以运行 `npm run build` 构建静态文件。离线筛选人类可解地狱题可运行 `npm run hell:generate -- --attempts 300 --target-additions 5`。

## 特性

- 简单、中等、困难、专家、地狱五档题目
- 可选择混合题库、真人难度题库、NullSudoku 题库或本地生成
- 支持手动录入数独题目，并在唯一解校验通过后开始解题
- 内置两个 GitHub 开源题库：344 道真人难度数据，以及约 2 万道 Public Domain 分档题目
- 随机生成完整解并挖空，保证唯一解
- 地狱难度只从离线 verified 题库抽取，完整路径禁止 Brute Force / Give Up / Incomplete Solution
- 浏览器本地保存进度、计时和主题
- 数字键盘、键盘输入、提示、撤销、答案检查
- 内置常用逻辑提示，并通过 HoDoKu Core Worker 按需分析 111 个高级技巧、强制链和搜索步骤

## 开源许可

本项目自行编写的代码使用 MIT License。高级提示功能依赖 GPL-3.0-or-later 的 `hodoku-core-js`；分发组合、上游来源和完整许可文本见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。

## 题库来源

内置题库来自 [synnwang/sudoku_dataset_difficulty](https://github.com/synnwang/sudoku_dataset_difficulty)，数据文件采用 CC0 1.0 Universal。题目难度按照数据集的 `D_TR` 指标分档：简单 `< 1.1`、中等 `< 1.3`、困难 `< 1.75`、专家 `>= 1.75`。

另一个题库来自 [kinnnine/nullsudoku-datasets](https://github.com/kinnnine/nullsudoku-datasets)，包含 `simple`、`easy`、`intermediate`、`expert` 四档，每档 5,000 道题，数据和脚本采用 Public Domain。页面会显示 `GH-` 或 `NS-` 题目编号以标记来源。
