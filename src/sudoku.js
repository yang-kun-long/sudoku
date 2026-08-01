import datasetText from './data/20240415.csv?raw'
import simpleText from './data/nullsudoku/simple.txt?raw'
import easyText from './data/nullsudoku/easy.txt?raw'
import intermediateText from './data/nullsudoku/intermediate.txt?raw'
import expertText from './data/nullsudoku/expert.txt?raw'
import verifiedHellPool from './data/hell/verified.json'

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export const DIFFICULTIES = {
  easy: { label: '简单', clues: 43 },
  medium: { label: '中等', clues: 35 },
  hard: { label: '困难', clues: 30 },
  expert: { label: '专家', clues: 25 },
  hell: { label: '地狱', clues: 24 },
}

export const DATASET_SOURCE = 'synnwang/sudoku_dataset_difficulty · CC0 1.0'

// The source records human completion metrics. D_TR is used as the public difficulty signal.
export const OPEN_PUZZLES = datasetText
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((line) => {
    const [id, puzzle, dTo, dTr] = line.split(',')
    return { id, puzzle, dTo: Number(dTo), dTr: Number(dTr) }
  })
  .filter((item) => item.puzzle?.length === 81 && Number.isFinite(item.dTr))

function parseNullDataset(text, level) {
  return text.trim().split(/\r?\n/).map((line) => {
    const [id, puzzle, metric] = line.trim().split(/\s+/)
    return { id, puzzle, dTr: Number(metric), level, source: 'nullsudoku' }
  }).filter((item) => item.puzzle?.length === 81 && Number.isFinite(item.dTr))
}

export const NULL_PUZZLES = [
  ...parseNullDataset(simpleText, 'easy'),
  ...parseNullDataset(easyText, 'medium'),
  ...parseNullDataset(intermediateText, 'hard'),
  ...parseNullDataset(expertText, 'expert'),
]

export function datasetDifficulty(metric) {
  if (metric < 1.1) return 'easy'
  if (metric < 1.3) return 'medium'
  if (metric < 1.75) return 'hard'
  return 'expert'
}

export function pickDatasetPuzzle(level, source = 'mixed') {
  const humanPuzzles = OPEN_PUZZLES.filter((item) => datasetDifficulty(item.dTr) === level).map((item) => ({ ...item, level, source: 'human' }))
  const generatedPuzzles = NULL_PUZZLES.filter((item) => item.level === level)
  const pool = source === 'human' ? humanPuzzles : source === 'nullsudoku' ? generatedPuzzles : [...humanPuzzles, ...generatedPuzzles]
  if (!pool.length) return null
  const record = pool[Math.floor(Math.random() * pool.length)]
  const grid = Array.from({ length: 9 }, (_, row) => record.puzzle.slice(row * 9, row * 9 + 9).split('').map((value) => value === '.' || value === '0' ? 0 : Number(value)))
  const solved = solve(grid.map((row) => row.slice()), 2)
  if (solved.count !== 1 || !solved.solution) return null
  return { puzzle: grid, solution: solved.solution, id: `${record.source === 'nullsudoku' ? 'NS' : 'GH'}-${record.id}`, level: record.level || datasetDifficulty(record.dTr), metric: record.dTr, source: record.source }
}

function parsePuzzleGrid(value) {
  return Array.from({ length: 9 }, (_, row) => value.slice(row * 9, row * 9 + 9).split('').map((digit) => digit === '.' || digit === '0' ? 0 : Number(digit)))
}

export function getDatasetPuzzle(id) {
  const [prefix, ...idParts] = id.split('-')
  const rawId = idParts.join('-')
  const record = prefix === 'NS'
    ? NULL_PUZZLES.find((item) => item.id === rawId)
    : prefix === 'GH'
      ? OPEN_PUZZLES.find((item) => item.id === rawId)
      : null
  if (!record) return null
  const puzzle = parsePuzzleGrid(record.puzzle)
  const solved = solve(puzzle.map((row) => row.slice()), 2)
  if (solved.count !== 1 || !solved.solution) return null
  const level = record.level || datasetDifficulty(record.dTr)
  return { puzzle, solution: solved.solution, id, level, source: prefix === 'NS' ? 'nullsudoku' : 'human' }
}

export function encodePuzzle(grid) {
  const bytes = []
  let highNibble = null
  for (const value of grid.flat()) {
    if (highNibble === null) highNibble = value || 0
    else { bytes.push((highNibble << 4) | (value || 0)); highNibble = null }
  }
  if (highNibble !== null) bytes.push(highNibble << 4)
  let output = ''
  for (const byte of bytes) output += String.fromCharCode(byte)
  return btoa(output).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

export function decodePuzzle(encoded) {
  try {
    const normalized = encoded.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - encoded.length % 4) % 4)
    const binary = atob(normalized)
    const values = []
    for (const character of binary) {
      const byte = character.charCodeAt(0)
      values.push(byte >> 4)
      if (values.length < 81) values.push(byte & 15)
    }
    if (values.length !== 81 || values.some((value) => value > 9)) return null
    return Array.from({ length: 9 }, (_, row) => values.slice(row * 9, row * 9 + 9))
  } catch {
    return null
  }
}

const shuffled = (values) => values.slice().sort(() => Math.random() - 0.5)
const emptyGrid = () => Array.from({ length: 9 }, () => Array(9).fill(0))

function createSudokuTransform() {
  const digitMap = new Map(shuffled(DIGITS).map((digit, index) => [index + 1, digit]))
  const transpose = Math.random() < 0.5
  const bandOrder = shuffled([0, 1, 2])
  const stackOrder = shuffled([0, 1, 2])
  const rowOrder = bandOrder.flatMap((band) => shuffled([0, 1, 2]).map((offset) => band * 3 + offset))
  const colOrder = stackOrder.flatMap((stack) => shuffled([0, 1, 2]).map((offset) => stack * 3 + offset))
  return { digitMap, transpose, rowOrder, colOrder }
}

function transformSudokuGrid(grid, transform = createSudokuTransform()) {
  const { digitMap, transpose, rowOrder, colOrder } = transform
  return Array.from({ length: 9 }, (_, row) => Array.from({ length: 9 }, (_, col) => {
    const sourceRow = transpose ? colOrder[col] : rowOrder[row]
    const sourceCol = transpose ? rowOrder[row] : colOrder[col]
    const value = grid[sourceRow][sourceCol]
    return value ? digitMap.get(value) : 0
  }))
}

export function candidates(grid, row, col) {
  const used = new Set([...grid[row], ...grid.map((line) => line[col])])
  const boxRow = Math.floor(row / 3) * 3
  const boxCol = Math.floor(col / 3) * 3
  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) used.add(grid[r][c])
  }
  return shuffled(DIGITS.filter((number) => !used.has(number)))
}

function findEmpty(grid) {
  let best = null
  let bestOptions = null
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (grid[row][col]) continue
      const options = candidates(grid, row, col)
      if (!bestOptions || options.length < bestOptions.length) {
        best = [row, col]
        bestOptions = options
      }
    }
  }
  return best ? { row: best[0], col: best[1], options: bestOptions } : null
}

export function solve(grid, limit = 2) {
  let count = 0
  let firstSolution = null
  const walk = () => {
    if (count >= limit) return
    const spot = findEmpty(grid)
    if (!spot) {
      count += 1
      if (!firstSolution) firstSolution = grid.map((row) => row.slice())
      return
    }
    for (const number of spot.options) {
      grid[spot.row][spot.col] = number
      walk()
      grid[spot.row][spot.col] = 0
      if (count >= limit) return
    }
  }
  walk()
  return { count, solution: firstSolution }
}

export function generateSolution() {
  return solve(emptyGrid(), 1).solution
}

export function generatePuzzle(solution, clues) {
  const puzzle = solution.map((row) => row.slice())
  const cells = shuffled(Array.from({ length: 81 }, (_, index) => index))
  let remaining = 81
  for (const index of cells) {
    if (remaining <= clues) break
    const row = Math.floor(index / 9)
    const col = index % 9
    const previous = puzzle[row][col]
    puzzle[row][col] = 0
    if (solve(puzzle.map((line) => line.slice()), 2).count !== 1) puzzle[row][col] = previous
    else remaining -= 1
  }
  return puzzle
}

export function generateHellPuzzle() {
  const pool = Array.isArray(verifiedHellPool?.puzzles) ? verifiedHellPool.puzzles : []
  if (!pool.length) return null
  const seed = pool[Math.floor(Math.random() * pool.length)]
  const transform = createSudokuTransform()
  const puzzle = transformSudokuGrid(parsePuzzleGrid(seed.puzzle), transform)
  const solution = seed.solution?.length === 81
    ? transformSudokuGrid(parsePuzzleGrid(seed.solution), transform)
    : solve(puzzle.map((row) => row.slice()), 2).solution
  if (!solution) return null
  return {
    puzzle,
    solution,
    opening: seed.opening,
    seedId: seed.id,
  }
}

export function ratePuzzle(puzzle) {
  const clueCount = puzzle.flat().filter(Boolean).length
  let candidateTotal = 0
  let emptyCount = 0
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (!puzzle[row][col]) {
        candidateTotal += candidates(puzzle, row, col).length
        emptyCount += 1
      }
    }
  }
  const averageCandidates = emptyCount ? candidateTotal / emptyCount : 0
  const score = (45 - clueCount) * 2 + averageCandidates * 5
  if (score >= 44) return '专家'
  if (score >= 31) return '困难'
  if (score >= 20) return '中等'
  return '简单'
}
