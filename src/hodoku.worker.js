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

function formatCellToken(token = '') {
  const match = token.match(/r([1-9]+)c([1-9]+)/)
  if (!match) return token
  const rows = match[1].split('').map((row) => `第 ${row} 行`).join('、')
  const columns = match[2].split('').map((column) => `第 ${column} 列`).join('、')
  return `${rows}${columns}`
}

function tokenIndexes(token = '') {
  const match = token.match(/r([1-9]+)c([1-9]+)/)
  if (!match) return []
  const indexes = []
  for (const row of match[1]) {
    for (const column of match[2]) indexes.push((Number(row) - 1) * 9 + Number(column) - 1)
  }
  return indexes
}

function parseLinkToken(token = '') {
  const digit = token.match(/[1-9]/)?.[0]
  if (!digit) return null
  if (token.includes('=')) return { digit, type: 'strong', label: '强关系', description: `候选 ${digit} 在这里是二选一关系：前后两端至少有一个成立。` }
  if (token.includes('-')) return { digit, type: 'weak', label: '弱关系', description: `候选 ${digit} 在这里不能两边同时成立。` }
  return { digit, type: 'neutral', label: '候选', description: `继续跟踪候选 ${digit}。` }
}

function explainNotation(notation = '', actions = []) {
  const raw = notation.trim()
  if (!raw) return null
  const [leftSide, rightSide = ''] = raw.split('=>').map((part) => part.trim())
  const tokens = leftSide.split(/\s+/).filter(Boolean)
  const nodes = []
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (!/^r[1-9]+c[1-9]+$/.test(token)) continue
    const link = parseLinkToken(tokens[index - 1]) || parseLinkToken(tokens[index - 2]) || { digit: '', type: 'neutral', label: '候选', description: '跟踪这个候选位置。' }
    nodes.push({
      cell: token,
      indexes: tokenIndexes(token),
      cellText: formatCellToken(token),
      candidate: link.digit,
      relation: link.type,
      relationLabel: link.label,
      description: link.description,
    })
  }
  if (!nodes.length) return { raw, targetText: rightSide, nodes: [], summary: '这条高级记号暂时不能自动拆分，但删除目标已经标在棋盘上。' }
  const startsAt = nodes[0]
  const endsAt = nodes[nodes.length - 1]
  const actionText = actions.map((action) => `${formatCellToken(`r${action.row}c${action.col}`)}${action.type === 'set' ? `确定为 ${action.value}` : `排除 ${action.value}`}`).join('，')
  return {
    raw,
    targetText: rightSide,
    nodes,
    summary: `从 ${startsAt.cellText} 的候选 ${startsAt.candidate} 开始，沿着强弱关系交替传到 ${endsAt.cellText}；因此可以${actionText}。`,
  }
}

function isChainTechnique(technique = '') {
  return /(Chain|AIC|Loop|Colors|Colour|Forcing|Remote Pair|Skyscraper|Kite|Turbot|Empty Rectangle)/.test(technique)
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
  const searchNotice = step.technique === 'Brute Force' ? '当前常规与高级逻辑均无法继续，完整搜索确认：' : `${name} 可得：`
  const chain = isChainTechnique(step.technique) ? explainNotation(step.notation, step.actions) : null
  return {
    strategy: step.technique,
    strategyLabel: name,
    type: step.actions.every((action) => action.type === 'eliminate') ? 'elimination' : 'value',
    updates,
    cells: [...new Set([...notationCells(step.notation), ...updates.map((update) => update.index)])],
    message: `${searchNotice}${actionText}。${chain?.summary ? ` ${chain.summary}` : ''}`,
    chain,
    rating: { difficulty: rating.difficulty, score: rating.score, bruteForced: rating.bruteForced },
  }
}

self.onmessage = async ({ data }) => {
  const { id, puzzle, type } = data
  if (type === 'catalog') {
    self.postMessage({ id, result: [...HODOKU_TECHNIQUES], error: null })
    return
  }
  if (type === 'rating') {
    try {
      const rating = await rateSudoku({ puzzle })
      self.postMessage({ id, result: rating ? { difficulty: rating.difficulty, score: rating.score, bruteForced: rating.bruteForced, givenUp: rating.givenUp, unsolvable: rating.unsolvable } : null, error: null })
    } catch (error) {
      self.postMessage({ id, result: null, error: error instanceof Error ? error.message : String(error) })
    }
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
