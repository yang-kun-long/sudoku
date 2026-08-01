import { HODOKU_TECHNIQUES, rateSudoku } from 'hodoku-core-js'

const techniqueNames = {
  'Brute Force': '搜索',
  'Forcing Chain': '强制链',
  'Forcing Chain Contradiction': '强制链反证',
  'Forcing Chain Verity': '强制链确认',
  'Forcing Net': '强制网',
  'Forcing Net Contradiction': '强制网反证',
  'Forcing Net Verity': '强制网确认',
  'Almost Locked Set XZ-Rule': 'ALS-XZ 规则',
  'Almost Locked Set XY-Wing': 'ALS XY-Wing',
  'Almost Locked Set XY-Chain': 'ALS XY-Chain',
  'Bivalue Universal Grave + 1': 'BUG+1',
  'Simple Colors': '简单染色',
  'Multi Colors': '多重染色',
  'Template Set': '模板确认',
  'Template Delete': '模板排除',
}

function displayTechnique(technique) {
  if (techniqueNames[technique]) return techniqueNames[technique]
  if (technique.includes('Uniqueness Test')) return `唯一矩形 ${technique.match(/\d+/)?.[0] || ''}`.trim()
  if (technique.includes('Nice Loop') || technique.includes('AIC')) return technique.replace('Grouped', '分组').replace('Continuous', '连续').replace('Discontinuous', '不连续')
  return technique
}

function notationCells(notation = '') {
  const cells = new Set()
  for (const match of notation.matchAll(/r([1-9]+)c([1-9]+)/g)) {
    for (const row of match[1]) {
      for (const column of match[2]) cells.add((Number(row) - 1) * 9 + Number(column) - 1)
    }
  }
  return [...cells]
}

function normalizeStep(step, rating) {
  if (!step?.actions?.length) return null
  const updates = step.actions.map((action) => {
    const index = (action.row - 1) * 9 + action.col - 1
    return action.type === 'set'
      ? { index, filledValue: action.value }
      : { index, eliminatedCandidate: action.value }
  })
  const actionText = step.actions.map((action) => `第 ${action.row} 行第 ${action.col} 列${action.type === 'set' ? `确定为 ${action.value}` : `排除 ${action.value}`}`).join('，')
  const name = displayTechnique(step.technique)
  const notation = step.notation?.trim() ? ` 原始链式记号：${step.notation}。` : ''
  const searchNotice = step.technique === 'Brute Force' ? '当前常规与高级逻辑均无法继续，完整搜索确认：' : `${name} 可得：`
  return {
    strategy: step.technique,
    strategyLabel: name,
    type: step.actions.every((action) => action.type === 'eliminate') ? 'elimination' : 'value',
    updates,
    cells: [...new Set([...notationCells(step.notation), ...updates.map((update) => update.index)])],
    message: `${searchNotice}${actionText}。${notation}`,
    rating: { difficulty: rating.difficulty, score: rating.score, bruteForced: rating.bruteForced },
  }
}

self.onmessage = async ({ data }) => {
  const { id, puzzle, type } = data
  if (type === 'catalog') {
    self.postMessage({ id, result: [...HODOKU_TECHNIQUES], error: null })
    return
  }
  try {
    const rating = await rateSudoku({ puzzle, includePath: true })
    const step = rating?.steps?.find((candidate) => candidate.actions?.length)
    self.postMessage({ id, result: normalizeStep(step, rating), error: null })
  } catch (error) {
    self.postMessage({ id, result: null, error: error instanceof Error ? error.message : String(error) })
  }
}
