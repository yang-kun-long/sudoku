<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { DATASET_SOURCE, DIFFICULTIES, candidates, decodePuzzle, encodePuzzle, generateHellPuzzle, generatePuzzle, generateSolution, getDatasetPuzzle, pickDatasetPuzzle, ratePuzzle, solve } from './sudoku'
import { getLogicalHint } from './logicalHint'
import { getAdvancedHint } from './advancedHint'
import { findTechniqueGuide } from './techniqueGuides'

const puzzle = ref([])
const solution = ref([])
const entries = ref(Array(81).fill(0))
const notes = ref(Array.from({ length: 81 }, () => []))
const manualGrid = ref(Array(81).fill(0))
const manualEditing = ref(false)
const selected = ref(-1)
const history = ref([])
const pencilMode = ref(false)
const smartCandidatesEnabled = ref(false)
const focusedNumber = ref(0)
const hintCells = ref([])
const hintMessage = ref('')
const lastHintStrategy = ref('')
const hintLoading = ref(false)
const difficulty = ref('easy')
const sourceChoice = ref('mixed')
const ratingLabel = ref('简单')
const mistakes = ref(0)
const seconds = ref(0)
const status = ref('选择一个格子，然后输入数字。')
const statusType = ref('')
const isDark = ref(localStorage.getItem('sudoku-theme') === 'dark')
let timerId
let numberClickTimer
let numberLongPressTimer
let numberLongPressTriggered = false

const difficultyLabel = computed(() => ratingLabel.value || DIFFICULTIES[difficulty.value].label)
const newPuzzleLabel = computed(() => difficulty.value === 'hell' ? '生成地狱题目' : sourceChoice.value === 'generated' ? '生成新题目' : '抽取题目')
const filledCount = computed(() => manualEditing.value ? manualGrid.value.filter(Boolean).length : puzzle.value.flat().filter(Boolean).length + entries.value.filter(Boolean).length)
const timerText = computed(() => `${String(Math.floor(seconds.value / 60)).padStart(2, '0')}:${String(seconds.value % 60).padStart(2, '0')}`)
const hintGuide = computed(() => findTechniqueGuide(lastHintStrategy.value))
const puzzleId = ref('-')
const sourceLabel = ref('本地生成')
const sourceOptions = [
  { value: 'mixed', label: '混合题库' },
  { value: 'human', label: '真人难度题库' },
  { value: 'nullsudoku', label: 'NullSudoku 题库' },
  { value: 'generated', label: '本地生成' },
  { value: 'manual', label: '手动输入题目' },
]

function setStatus(message, type = '') { status.value = message; statusType.value = type }
function cellAt(index) { return { row: Math.floor(index / 9), col: index % 9 } }
function isGiven(index) { const { row, col } = cellAt(index); return Boolean(puzzle.value[row]?.[col]) }
function cellValue(index) { const { row, col } = cellAt(index); return puzzle.value[row]?.[col] || entries.value[index] || '' }
function cellNotes(index) { return notes.value[index] || [] }
function digitCount(number) {
  const values = manualEditing.value ? manualGrid.value : Array.from({ length: 81 }, (_, index) => Number(cellValue(index)) || 0)
  return values.filter((value) => value === number).length
}
function isRelated(index) { if (selected.value < 0) return false; const a = cellAt(index), b = cellAt(selected.value); return a.row === b.row || a.col === b.col || (Math.floor(a.row / 3) === Math.floor(b.row / 3) && Math.floor(a.col / 3) === Math.floor(b.col / 3)) }
function isConflict(index) { const { row, col } = cellAt(index); return entries.value[index] && entries.value[index] !== solution.value[row]?.[col] }
function clearLogicalHint() { hintCells.value = []; hintMessage.value = '' }
function selectCell(index) { selected.value = index; focusedNumber.value = 0; clearLogicalHint() }
function focusCellNumber(index) { const value = Number(manualEditing.value ? manualGrid.value[index] : cellValue(index)); if (!value) return; focusedNumber.value = value; selected.value = -1 }
function isFocusedNumber(index) { return focusedNumber.value > 0 && Number(cellValue(index)) === focusedNumber.value }
function isNumberInfluenced(index) {
  if (!focusedNumber.value) return false
  const target = cellAt(index)
  return Array.from({ length: 81 }, (_, cellIndex) => cellIndex).some((cellIndex) => {
    if (Number(cellValue(cellIndex)) !== focusedNumber.value) return false
    const source = cellAt(cellIndex)
    return target.row === source.row || target.col === source.col || (Math.floor(target.row / 3) === Math.floor(source.row / 3) && Math.floor(target.col / 3) === Math.floor(source.col / 3))
  })
}

function saveGame() {
  localStorage.setItem('sudoku-state', JSON.stringify({ puzzle: puzzle.value, solution: solution.value, entries: entries.value, notes: notes.value, manualGrid: manualGrid.value, manualEditing: manualEditing.value, smartCandidatesEnabled: smartCandidatesEnabled.value, lastHintStrategy: lastHintStrategy.value, difficulty: difficulty.value, sourceChoice: sourceChoice.value, ratingLabel: ratingLabel.value, mistakes: mistakes.value, seconds: seconds.value, id: puzzleId.value, sourceLabel: sourceLabel.value }))
}
function rememberState() { history.value.push({ entries: entries.value.slice(), notes: notes.value.map((cellNotes) => cellNotes.slice()), smartCandidatesEnabled: smartCandidatesEnabled.value, lastHintStrategy: lastHintStrategy.value }) }
function startTimer() { clearInterval(timerId); timerId = setInterval(() => { seconds.value += 1 }, 1000) }
function enterManualMode() {
  clearInterval(timerId)
  puzzle.value = []
  solution.value = []
  manualGrid.value = Array(81).fill(0)
  entries.value = Array(81).fill(0)
  notes.value = Array.from({ length: 81 }, () => [])
  history.value = []
  manualEditing.value = true
  selected.value = -1
  focusedNumber.value = 0
  pencilMode.value = false
  smartCandidatesEnabled.value = false
  lastHintStrategy.value = ''
  mistakes.value = 0
  seconds.value = 0
  puzzleId.value = '-'
  ratingLabel.value = '自定义'
  sourceLabel.value = '手动输入'
  clearLogicalHint()
  setStatus('请在棋盘中输入题目。')
  saveGame()
}
function newGame() {
  if (sourceChoice.value === 'manual') {
    enterManualMode()
    return
  }
  const fromDataset = difficulty.value === 'hell' || sourceChoice.value === 'generated' ? null : pickDatasetPuzzle(difficulty.value, sourceChoice.value)
  if (fromDataset) {
    puzzle.value = fromDataset.puzzle
    solution.value = fromDataset.solution
    ratingLabel.value = DIFFICULTIES[fromDataset.level].label
    puzzleId.value = fromDataset.id
    sourceLabel.value = DATASET_SOURCE
  } else if (difficulty.value === 'hell') {
    const hellPuzzle = generateHellPuzzle()
    if (!hellPuzzle) return setStatus('地狱题库还没有合格题，请先运行离线铸题脚本。', 'error')
    puzzle.value = hellPuzzle.puzzle
    solution.value = hellPuzzle.solution
    ratingLabel.value = DIFFICULTIES.hell.label
    puzzleId.value = `HELL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    sourceLabel.value = `本地地狱题库：HoDoKu 高分逻辑题，完整路径无搜索${hellPuzzle.score ? `，评分 ${hellPuzzle.score}` : ''}`
  } else {
    solution.value = generateSolution()
    puzzle.value = generatePuzzle(solution.value, DIFFICULTIES[difficulty.value].clues)
    ratingLabel.value = ratePuzzle(puzzle.value)
    puzzleId.value = `GEN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    sourceLabel.value = '本地生成'
  }
  entries.value = Array(81).fill(0)
  notes.value = Array.from({ length: 81 }, () => [])
  history.value = []
  selected.value = -1
  focusedNumber.value = 0
  pencilMode.value = false
  smartCandidatesEnabled.value = false
  lastHintStrategy.value = ''
  mistakes.value = 0
  seconds.value = 0
  clearLogicalHint()
  setStatus('选择一个格子，然后输入数字。')
  startTimer(); saveGame()
}
function startManualGame() {
  const grid = Array.from({ length: 9 }, (_, row) => manualGrid.value.slice(row * 9, row * 9 + 9))
  const result = solve(grid.map((row) => row.slice()), 2)
  if (result.count === 0) return setStatus('这道题无解，请检查输入。', 'error')
  if (result.count > 1) return setStatus('这道题有多个解，请继续填写题目。', 'error')
  puzzle.value = grid
  solution.value = result.solution
  entries.value = Array(81).fill(0)
  notes.value = Array.from({ length: 81 }, () => [])
  history.value = []
  manualEditing.value = false
  selected.value = -1
  focusedNumber.value = 0
  smartCandidatesEnabled.value = false
  lastHintStrategy.value = ''
  mistakes.value = 0
  seconds.value = 0
  clearLogicalHint()
  ratingLabel.value = ratePuzzle(grid)
  puzzleId.value = 'MANUAL'
  sourceLabel.value = '手动输入'
  setStatus('选择一个格子，然后输入数字。')
  startTimer(); saveGame()
}
function beginPuzzle() { if (sourceChoice.value === 'manual' && manualEditing.value) startManualGame(); else newGame() }
function applySharedPuzzle(sharedPuzzle, sharedSolution, id, source, label, options = {}) {
  puzzle.value = sharedPuzzle
  solution.value = sharedSolution
  entries.value = Array(81).fill(0)
  notes.value = Array.from({ length: 81 }, () => [])
  history.value = []
  manualEditing.value = false
  selected.value = -1
  pencilMode.value = false
  smartCandidatesEnabled.value = false
  lastHintStrategy.value = ''
  mistakes.value = 0
  seconds.value = 0
  clearLogicalHint()
  puzzleId.value = id
  sourceLabel.value = label
  sourceChoice.value = source
  if (options.difficulty) difficulty.value = options.difficulty
  ratingLabel.value = options.ratingLabel || ratePuzzle(sharedPuzzle)
  setStatus('已载入分享题目，选择一个格子开始。', 'success')
  startTimer(); saveGame()
}
function loadSharedPuzzle() {
  const raw = location.hash.startsWith('#share=') ? decodeURIComponent(location.hash.slice(7)) : ''
  if (!raw) return false
  if (raw.startsWith('d.')) {
    const shared = getDatasetPuzzle(raw.slice(2))
    if (!shared) return false
    applySharedPuzzle(shared.puzzle, shared.solution, shared.id, shared.source === 'human' ? 'human' : 'nullsudoku', shared.source === 'human' ? DATASET_SOURCE : 'NullSudoku 题库')
    return true
  }
  if (raw.startsWith('p.')) {
    const sharedPuzzle = decodePuzzle(raw.slice(2))
    if (!sharedPuzzle) return false
    const result = solve(sharedPuzzle.map((row) => row.slice()), 2)
    if (result.count !== 1 || !result.solution) return false
    applySharedPuzzle(sharedPuzzle, result.solution, 'SHARED', 'generated', '分享题目')
    return true
  }
  if (raw.startsWith('h.')) {
    const sharedPuzzle = decodePuzzle(raw.slice(2))
    if (!sharedPuzzle) return false
    const result = solve(sharedPuzzle.map((row) => row.slice()), 2)
    if (result.count !== 1 || !result.solution) return false
    applySharedPuzzle(sharedPuzzle, result.solution, 'HELL-SHARED', 'generated', '分享地狱题目：HoDoKu 高分逻辑题，完整路径无搜索', { difficulty: 'hell', ratingLabel: DIFFICULTIES.hell.label })
    return true
  }
  return false
}
async function sharePuzzle() {
  if (manualEditing.value) return setStatus('请先点击“开始解题”，再分享题目。', 'error')
  const encodedPuzzle = encodePuzzle(puzzle.value)
  const payload = puzzleId.value.startsWith('GH-') || puzzleId.value.startsWith('NS-')
    ? `d.${puzzleId.value}`
    : puzzleId.value.startsWith('HELL-')
      ? `h.${encodedPuzzle}`
      : `p.${encodedPuzzle}`
  const shareUrl = `${location.origin}${location.pathname}#share=${encodeURIComponent(payload)}`
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl)
    } else {
      const input = document.createElement('textarea')
      input.value = shareUrl
      input.setAttribute('readonly', '')
      input.style.position = 'fixed'
      input.style.opacity = '0'
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      input.remove()
    }
    setStatus('分享链接已复制。', 'success')
  } catch (error) {
    setStatus('复制失败，请稍后重试。', 'error')
  }
}
function loadGame() {
  try {
    const saved = JSON.parse(localStorage.getItem('sudoku-state'))
    if (!saved?.puzzle || !saved?.solution) return newGame()
    puzzle.value = saved.puzzle; solution.value = saved.solution; entries.value = saved.entries || Array(81).fill(0); notes.value = saved.notes || Array.from({ length: 81 }, () => []); manualGrid.value = saved.manualGrid || Array(81).fill(0); manualEditing.value = saved.manualEditing ?? saved.sourceChoice === 'manual'; smartCandidatesEnabled.value = Boolean(saved.smartCandidatesEnabled); lastHintStrategy.value = saved.lastHintStrategy || ''
    difficulty.value = saved.difficulty || 'easy'; sourceChoice.value = saved.sourceChoice || 'mixed'; ratingLabel.value = saved.ratingLabel || ratePuzzle(puzzle.value)
    mistakes.value = saved.mistakes || 0; seconds.value = saved.seconds || 0; puzzleId.value = saved.id || '-'; sourceLabel.value = saved.sourceLabel || '本地生成'; if (manualEditing.value) { clearInterval(timerId); setStatus('请在棋盘中输入题目。') } else startTimer()
  } catch { newGame() }
}
function enterManualNumber(number) {
  if (selected.value < 0) return setStatus('请先选择一个空格。', 'error')
  manualGrid.value[selected.value] = number
  setStatus('')
  saveGame()
}
function togglePencilMode() {
  if (manualEditing.value) return setStatus('开始解题后才能使用铅笔。', 'error')
  pencilMode.value = !pencilMode.value
  setStatus(pencilMode.value ? '铅笔模式已开启。' : '铅笔模式已关闭。', pencilMode.value ? 'success' : '')
}
function removeCandidateFromPeers(index, number) {
  const source = cellAt(index)
  notes.value = notes.value.map((cellNotes, cellIndex) => {
    const target = cellAt(cellIndex)
    const related = cellIndex !== index && (target.row === source.row || target.col === source.col || (Math.floor(target.row / 3) === Math.floor(source.row / 3) && Math.floor(target.col / 3) === Math.floor(source.col / 3)))
    return related ? cellNotes.filter((candidate) => candidate !== number) : cellNotes
  })
}
function fillSmartCandidates() {
  if (manualEditing.value) return setStatus('开始解题后才能填写候选数。', 'error')
  rememberState()
  clearLogicalHint()
  lastHintStrategy.value = ''
  if (smartCandidatesEnabled.value) {
    notes.value = Array.from({ length: 81 }, () => [])
    smartCandidatesEnabled.value = false
    setStatus('智能余数已隐藏。')
    saveGame()
    return
  }
  const currentGrid = Array.from({ length: 9 }, (_, row) => Array.from({ length: 9 }, (_, col) => puzzle.value[row][col] || entries.value[row * 9 + col] || 0))
  notes.value = notes.value.map((cellNotes, index) => {
    const { row, col } = cellAt(index)
    if (currentGrid[row][col]) return []
    return candidates(currentGrid, row, col).sort((a, b) => a - b)
  })
  smartCandidatesEnabled.value = true
  setStatus('智能余数已显示。', 'success')
  saveGame()
}
function enterNumber(number, forceFinal = false) {
  if (manualEditing.value) return enterManualNumber(number)
  if (selected.value < 0) return setStatus('请先选择一个空格。', 'error')
  if (isGiven(selected.value)) return
  const index = selected.value; const { row, col } = cellAt(index)
  rememberState()
  lastHintStrategy.value = ''
  if (pencilMode.value && number && !forceFinal) {
    const currentNotes = notes.value[index].slice()
    notes.value[index] = currentNotes.includes(number) ? currentNotes.filter((value) => value !== number) : [...currentNotes, number].sort((a, b) => a - b)
    setStatus('铅笔模式：已更新候选数字。')
    saveGame()
    return
  }
  entries.value[index] = number
  if (number) { notes.value[index] = []; removeCandidateFromPeers(index, number) }
  if (number && number !== solution.value[row][col]) { mistakes.value += 1; setStatus('这个数字不在答案中。', 'error') } else setStatus('')
  checkComplete(); saveGame()
}
function handleNumberClick(number) {
  if (!pencilMode.value) return enterNumber(number)
  clearTimeout(numberClickTimer)
  numberClickTimer = setTimeout(() => enterNumber(number), 220)
}
function handleNumberDoubleClick(number) {
  if (!pencilMode.value) return
  clearTimeout(numberClickTimer)
  enterNumber(number, true)
}
function keepOnlyCandidate(number) {
  if (manualEditing.value || selected.value < 0 || isGiven(selected.value) || cellValue(selected.value)) return setStatus('请先选择一个有多个候选的空格。', 'error')
  const currentNotes = notes.value[selected.value]
  if (currentNotes.length < 2 || !currentNotes.includes(number)) return setStatus(`当前格没有多个包含 ${number} 的候选。`, 'error')
  rememberState()
  lastHintStrategy.value = ''
  notes.value[selected.value] = [number]
  removeCandidateFromPeers(selected.value, number)
  clearLogicalHint()
  setStatus(`已保留候选 ${number}，并从影响范围内排除该候选。`, 'success')
  saveGame()
}
function startNumberLongPress(number, event) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  clearTimeout(numberLongPressTimer)
  numberLongPressTriggered = false
  numberLongPressTimer = setTimeout(() => {
    numberLongPressTriggered = true
    clearTimeout(numberClickTimer)
    keepOnlyCandidate(number)
  }, 500)
}
function finishNumberPress(number) {
  clearTimeout(numberLongPressTimer)
  if (!numberLongPressTriggered) handleNumberClick(number)
  numberLongPressTriggered = false
}
function cancelNumberLongPress() {
  clearTimeout(numberLongPressTimer)
  numberLongPressTriggered = false
}
function handleNumberButtonClick(number, event) {
  if (event.detail === 0) handleNumberClick(number)
}
function eraseSelected() { if (manualEditing.value) return enterManualNumber(0); if (selected.value < 0) return setStatus('请先选择一个空格。', 'error'); if (isGiven(selected.value)) return; rememberState(); lastHintStrategy.value = ''; entries.value[selected.value] = 0; notes.value[selected.value] = []; setStatus('已清除当前格子。'); saveGame() }
function undo() { const previous = history.value.pop(); if (!previous) return setStatus('没有可以撤销的操作。'); if (Array.isArray(previous)) entries.value = previous; else { entries.value = previous.entries; notes.value = previous.notes; smartCandidatesEnabled.value = Boolean(previous.smartCandidatesEnabled); lastHintStrategy.value = previous.lastHintStrategy || '' }; setStatus('已撤销上一步操作。'); saveGame() }
async function giveHint() {
  if (hintLoading.value) return
  if (manualEditing.value) return setStatus('开始解题后才能使用提示。', 'error')
  const hasWrongEntry = entries.value.some((number, index) => number && number !== solution.value[cellAt(index).row][cellAt(index).col])
  if (hasWrongEntry) return setStatus('盘面中有错误数字，请先修正红色格子。', 'error')
  lastHintStrategy.value = ''
  const currentGrid = Array.from({ length: 9 }, (_, row) => Array.from({ length: 9 }, (_, col) => puzzle.value[row][col] || entries.value[row * 9 + col] || 0))
  const logicalBoard = currentGrid.flat().map((number) => number || null)
  const hasCompleteCandidateNotes = logicalBoard.every((number, index) => number || notes.value[index].length)
  let hint = getLogicalHint(logicalBoard, hasCompleteCandidateNotes ? notes.value : null)
  if (!hint) {
    const stateSignature = JSON.stringify({ board: logicalBoard, notes: hasCompleteCandidateNotes ? notes.value : null })
    hintCells.value = []
    hintMessage.value = '正在运行完整高级策略分析，请稍候。'
    hintLoading.value = true
    setStatus('正在分析 AIC、ALS、强制链及搜索路径…')
    try {
      hint = await getAdvancedHint(logicalBoard, hasCompleteCandidateNotes ? notes.value : null)
      const latestGrid = Array.from({ length: 9 }, (_, row) => Array.from({ length: 9 }, (_, col) => puzzle.value[row][col] || entries.value[row * 9 + col] || 0)).flat().map((number) => number || null)
      const latestHasCompleteNotes = latestGrid.every((number, index) => number || notes.value[index].length)
      const latestSignature = JSON.stringify({ board: latestGrid, notes: latestHasCompleteNotes ? notes.value : null })
      if (latestSignature !== stateSignature) {
        hintMessage.value = ''
        return setStatus('盘面已变化，请重新获取提示。')
      }
    } catch (error) {
      hintMessage.value = `高级提示分析失败：${error instanceof Error ? error.message : '未知错误'}。`
      return setStatus('高级提示引擎暂时不可用。', 'error')
    } finally {
      hintLoading.value = false
    }
    if (!hint) {
      hintMessage.value = '完整高级策略与搜索均未找到可执行的下一步。'
      return setStatus('未找到可执行的下一步。', 'error')
    }
  }
  rememberState()
  notes.value = notes.value.map((cellNotes, index) => {
    const { row, col } = cellAt(index)
    if (currentGrid[row][col]) return []
    return cellNotes.length ? cellNotes : candidates(currentGrid, row, col).sort((a, b) => a - b)
  })
  if (hint.type === 'elimination') {
    for (const update of hint.updates) {
      notes.value[update.index] = notes.value[update.index].filter((number) => number !== update.eliminatedCandidate)
    }
  }
  hintCells.value = hint.cells
  hintMessage.value = hint.message
  lastHintStrategy.value = hint.strategy
  setStatus('已标出下一步推理范围。', 'success')
  saveGame()
}
function checkComplete() {
  const complete = entries.value.every((number, index) => { const { row, col } = cellAt(index); return (puzzle.value[row][col] || number) === solution.value[row][col] })
  if (complete) { setStatus(`完成！用时 ${timerText.value}。`, 'success'); clearInterval(timerId) }
}
function checkAnswer() { const wrong = entries.value.some((number, index) => number && number !== solution.value[cellAt(index).row][cellAt(index).col]); setStatus(wrong ? '发现错误数字，请继续检查。' : '目前填写正确，继续完成棋盘。', wrong ? 'error' : 'success') }
function toggleTheme() { isDark.value = !isDark.value; localStorage.setItem('sudoku-theme', isDark.value ? 'dark' : 'light') }
function onKeydown(event) { if (/^[1-9]$/.test(event.key)) enterNumber(Number(event.key)); if (event.key === 'Backspace' || event.key === 'Delete') enterNumber(0) }
watch([puzzle, entries, notes, manualGrid, mistakes, seconds], saveGame, { deep: true })
function handleSourceChange() { if (sourceChoice.value === 'manual') enterManualMode(); else if (manualEditing.value) { manualEditing.value = false; setStatus('已切换题目来源，点击按钮开始。') } }
watch(isDark, (value) => { document.body.classList.toggle('dark-page', value) }, { immediate: true })
onMounted(() => { if (!loadSharedPuzzle()) loadGame(); window.addEventListener('keydown', onKeydown) })
onUnmounted(() => { clearInterval(timerId); clearTimeout(numberClickTimer); clearTimeout(numberLongPressTimer); window.removeEventListener('keydown', onKeydown) })
</script>

<template>
  <main class="app-shell" :class="{ dark: isDark }">
    <header class="topbar"><div class="brand-block"><p class="eyebrow">SUDOKU LAB</p><h1>数独练习</h1></div><div class="mobile-actions" aria-label="常用工具"><button class="quick-action" type="button" title="分享题目" aria-label="分享题目" @click="sharePuzzle">↗</button><button class="quick-action" :class="{ active: pencilMode }" type="button" title="铅笔" aria-label="铅笔" :aria-pressed="pencilMode" @click="togglePencilMode">✎</button><button class="quick-action" :class="{ active: smartCandidatesEnabled }" type="button" title="智能余数" aria-label="智能余数" :aria-pressed="smartCandidatesEnabled" @click="fillSmartCandidates">候</button><button class="quick-action" type="button" title="橡皮擦" aria-label="橡皮擦" @click="eraseSelected">⌫</button></div><div class="topbar-links"><RouterLink class="icon-button guide-link" to="/techniques" title="数独技巧图解" aria-label="数独技巧图解">?</RouterLink><button class="icon-button" type="button" title="切换主题" aria-label="切换主题" @click="toggleTheme">◐</button></div></header>
    <section class="game-layout">
      <section class="board-panel" aria-label="数独棋盘">
        <div class="board-head"><div class="difficulty-display"><span class="label">当前难度</span><strong>{{ difficultyLabel }}</strong></div><div class="quick-actions" aria-label="常用工具"><button class="quick-action mobile-primary" type="button" title="分享题目" aria-label="分享题目" @click="sharePuzzle">↗</button><button class="quick-action mobile-primary" :class="{ active: pencilMode }" type="button" title="铅笔" aria-label="铅笔" :aria-pressed="pencilMode" @click="togglePencilMode">✎</button><button class="quick-action mobile-primary" :class="{ active: smartCandidatesEnabled }" type="button" title="智能余数" aria-label="智能余数" :aria-pressed="smartCandidatesEnabled" @click="fillSmartCandidates">候</button><button class="quick-action mobile-primary" type="button" title="橡皮擦" aria-label="橡皮擦" @click="eraseSelected">⌫</button><button class="quick-action" type="button" :title="hintLoading ? '正在分析' : '提示'" :aria-label="hintLoading ? '正在分析提示' : '提示'" :disabled="hintLoading" @click="giveHint">{{ hintLoading ? '…' : '✦' }}</button><button class="quick-action" type="button" title="撤销" aria-label="撤销" @click="undo">↶</button><button class="quick-action" type="button" title="检查答案" aria-label="检查答案" @click="checkAnswer">✓</button></div><div class="timer">{{ timerText }}</div></div>
        <div class="board" role="grid" aria-label="数独棋盘">
          <template v-if="manualEditing"><button v-for="index in 81" :key="index" class="cell editable" :class="{ selected: selected === index - 1 }" type="button" role="gridcell" @click="selectCell(index - 1)">{{ manualGrid[index - 1] || '' }}</button></template>
          <template v-else><button v-for="index in 81" :key="index" class="cell" :class="{ given: isGiven(index - 1), editable: !isGiven(index - 1), selected: selected === index - 1, related: isRelated(index - 1) && selected !== index - 1, conflict: isConflict(index - 1), 'number-influence': isNumberInfluenced(index - 1), 'number-focus': isFocusedNumber(index - 1), 'hint-target': hintCells.includes(index - 1) }" type="button" role="gridcell" @click="selectCell(index - 1)" @dblclick.stop="focusCellNumber(index - 1)"><span class="cell-value">{{ cellValue(index - 1) }}</span><span v-if="!cellValue(index - 1)" class="notes"><span v-for="note in 9" :key="note" :class="{ visible: cellNotes(index - 1).includes(note) }">{{ note }}</span></span></button></template>
        </div>
        <p class="status" :class="statusType" role="status">{{ status }}</p>
        <div v-if="hintMessage" class="hint-panel">
          <strong>解题思路</strong>
          <div class="hint-copy">
            <RouterLink v-if="hintGuide" class="hint-method-link" :to="`/techniques/${hintGuide.id}`">本次方法：{{ hintGuide.label }}</RouterLink>
            <span>{{ hintMessage }}</span>
          </div>
        </div>
        <div class="number-pad" aria-label="数字键盘"><button v-for="number in 9" :key="number" type="button" @pointerdown="startNumberLongPress(number, $event)" @pointerup="finishNumberPress(number)" @pointercancel="cancelNumberLongPress" @pointerleave="cancelNumberLongPress" @contextmenu.prevent @click="handleNumberButtonClick(number, $event)" @dblclick.prevent="handleNumberDoubleClick(number)"><span class="number-label">{{ number }}</span><span class="number-count">{{ digitCount(number) }}/9</span></button><button class="erase" type="button" @click="enterNumber(0)">清除</button></div>
      </section>
      <aside class="side-panel">
        <section class="control-section"><span class="label">开始一局</span><label class="source-select"><span>题目来源</span><select v-model="sourceChoice" aria-label="选择题目来源" @change="handleSourceChange"><option v-for="option in sourceOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label><div class="difficulty-tabs" role="tablist" aria-label="选择难度"><button v-for="(config, key) in DIFFICULTIES" :key="key" :class="{ active: difficulty === key }" type="button" @click="difficulty = key">{{ config.label }}</button></div><button class="primary-button" type="button" @click="beginPuzzle">{{ sourceChoice === 'manual' && manualEditing ? '开始解题' : newPuzzleLabel }} <span>↗</span></button></section>
        <section class="stats-section"><span class="label">本局信息</span><div class="stat-row"><span>已填数字</span><strong>{{ filledCount }} / 81</strong></div><div class="stat-row"><span>错误</span><strong>{{ mistakes }}</strong></div><div class="stat-row"><span>题目编号</span><strong>{{ puzzleId }}</strong></div><div class="source-note">{{ sourceLabel }}</div></section>
      </aside>
    </section>
    <footer class="footer">题目在浏览器本地生成，不上传任何数据。</footer>
  </main>
</template>
