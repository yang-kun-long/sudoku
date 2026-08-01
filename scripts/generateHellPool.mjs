import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { generateSudoku, rateSudoku } from 'hodoku-core-js'
import { getLogicalHint } from '../src/logicalHint.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const defaultOutput = path.join(projectRoot, 'src/data/hell/verified.json')

const BAD_PATH_TECHNIQUES = new Set(['Brute Force', 'Give Up', 'Incomplete Solution'])
const LOCAL_ADVANCED_OPENERS = new Set(['Junior Exocet'])
const HODOKU_ADVANCED_OPENERS = [
  'AIC',
  'Nice Loop',
  'Almost Locked Set',
  'Sue de Coq',
  'Death Blossom',
  'Forcing Chain',
  'Forcing Net',
  'Uniqueness Test',
  'Bivalue Universal Grave',
  'Kraken Fish',
  'Franken',
  'Mutant',
  'Finned',
  'Sashimi',
  'Template',
  'W-Wing',
  'X-Chain',
  'XY-Chain',
  'Remote Pair',
  'Colors',
  'Empty Rectangle',
  'Hidden Rectangle',
]
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    attempts: 200,
    targetAdditions: 5,
    difficulty: 'Extreme',
    output: defaultOutput,
    minScore: undefined,
    maxScore: undefined,
    maxRuntimeMinutes: 50,
    source: 'opening-freeze',
    minClues: 24,
    maxClues: 30,
    searchSteps: 160,
    buildMinScore: 10,
  }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    const readValue = () => args[++index]
    if (arg === '--attempts') options.attempts = Number(readValue())
    else if (arg === '--target-additions') options.targetAdditions = Number(readValue())
    else if (arg === '--difficulty') options.difficulty = readValue()
    else if (arg === '--output') options.output = path.resolve(projectRoot, readValue())
    else if (arg === '--min-score') options.minScore = Number(readValue())
    else if (arg === '--max-score') options.maxScore = Number(readValue())
    else if (arg === '--max-runtime-minutes') options.maxRuntimeMinutes = Number(readValue())
    else if (arg === '--source') options.source = readValue()
    else if (arg === '--min-clues') options.minClues = Number(readValue())
    else if (arg === '--max-clues') options.maxClues = Number(readValue())
    else if (arg === '--search-steps') options.searchSteps = Number(readValue())
    else if (arg === '--build-min-score') options.buildMinScore = Number(readValue())
    else if (arg === '--help') {
      console.log('Usage: node scripts/generateHellPool.mjs [--attempts 500] [--target-additions 10] [--difficulty Extreme] [--source hodoku|de-single|opening-freeze|opening-search|opening-build] [--min-clues 24] [--max-clues 30] [--search-steps 160] [--build-min-score 10] [--max-runtime-minutes 50]')
      process.exit(0)
    }
  }
  return options
}

function emptyPool() {
  return {
    version: 1,
    generatedAt: null,
    criteria: {
      openingAdvancedDepth: 1,
      allowBruteForce: false,
      allowGiveUp: false,
      allowIncomplete: false,
      notes: 'Puzzles must have a human-solvable HoDoKu path and an advanced opening gate.',
    },
    puzzles: [],
  }
}

function loadPool(outputPath) {
  if (!fs.existsSync(outputPath)) return emptyPool()
  const parsed = JSON.parse(fs.readFileSync(outputPath, 'utf8'))
  return { ...emptyPool(), ...parsed, puzzles: Array.isArray(parsed.puzzles) ? parsed.puzzles : [] }
}

function boardFromPuzzle(puzzle) {
  return [...puzzle].map((char) => /[1-9]/.test(char) ? Number(char) : null)
}

function shuffled(values) {
  return values.slice().sort(() => Math.random() - 0.5)
}

function gridToPuzzle(grid) {
  return grid.flat().map((value) => value || '.').join('')
}

function puzzleToGrid(puzzle) {
  return Array.from({ length: 9 }, (_, row) => puzzle.slice(row * 9, row * 9 + 9).split('').map((char) => /[1-9]/.test(char) ? Number(char) : 0))
}

function candidateList(grid, row, col) {
  const used = new Set([...grid[row], ...grid.map((line) => line[col])])
  const boxRow = Math.floor(row / 3) * 3
  const boxCol = Math.floor(col / 3) * 3
  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) used.add(grid[r][c])
  }
  return shuffled(DIGITS.filter((digit) => !used.has(digit)))
}

function findEmpty(grid) {
  let best = null
  let bestOptions = null
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (grid[row][col]) continue
      const options = candidateList(grid, row, col)
      if (!bestOptions || options.length < bestOptions.length) {
        best = { row, col, options }
        bestOptions = options
      }
    }
  }
  return best
}

function solveGrid(grid, limit = 2) {
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
    for (const digit of spot.options) {
      grid[spot.row][spot.col] = digit
      walk()
      grid[spot.row][spot.col] = 0
      if (count >= limit) return
    }
  }
  walk()
  return { count, solution: firstSolution }
}

function generateSolutionGrid() {
  return solveGrid(Array.from({ length: 9 }, () => Array(9).fill(0)), 1).solution
}

function randomInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1))
}

function generateUniquePuzzleByDigging(solution, clueCount) {
  const puzzle = solution.map((row) => row.slice())
  let remaining = 81
  for (const index of shuffled(Array.from({ length: 81 }, (_, cell) => cell))) {
    if (remaining <= clueCount) break
    const row = Math.floor(index / 9)
    const col = index % 9
    const previous = puzzle[row][col]
    puzzle[row][col] = 0
    if (solveGrid(puzzle.map((line) => line.slice()), 2).count !== 1) puzzle[row][col] = previous
    else remaining -= 1
  }
  return puzzle
}

function openingScore(puzzle) {
  const hint = getLogicalHint(puzzle.flat().map((value) => value || null))
  if (!hint) return { score: 95, hint: null }
  if (LOCAL_ADVANCED_OPENERS.has(hint.strategy)) return { score: 100, hint }
  const scores = {
    'Open Single': 0,
    'Naked Single': 1,
    'Hidden Single': 2,
    'Naked Pair': 10,
    'Hidden Pair': 12,
    'Locked Candidate': 18,
    'Claiming Candidate': 20,
    'Naked Triple': 25,
    'Hidden Triple': 28,
    'X-Wing': 35,
    Skyscraper: 38,
    'Two-String Kite': 40,
    'Y-Wing': 45,
    'XYZ-Wing': 48,
    Swordfish: 52,
    Jellyfish: 55,
  }
  return { score: scores[hint.strategy] ?? 5, hint }
}

function isOpeningAccepted(puzzle) {
  const { hint } = openingScore(puzzle)
  return !hint || LOCAL_ADVANCED_OPENERS.has(hint.strategy)
}

function isBuildOpeningAllowed(puzzle, minScore) {
  return openingScore(puzzle).score >= minScore
}

function arePeers(first, second) {
  if (first === second) return false
  const firstRow = Math.floor(first / 9)
  const firstCol = first % 9
  const secondRow = Math.floor(second / 9)
  const secondCol = second % 9
  return firstRow === secondRow
    || firstCol === secondCol
    || (Math.floor(firstRow / 3) === Math.floor(secondRow / 3) && Math.floor(firstCol / 3) === Math.floor(secondCol / 3))
}

function targetedRemovalIndexes(puzzle, hint, givens) {
  const targets = new Set(hint?.updates?.map((update) => update.index) || [])
  for (const cell of hint?.cells || []) targets.add(cell)
  if (!targets.size) return shuffled(givens)
  const targeted = givens.filter((index) => [...targets].some((target) => arePeers(index, target)))
  const rest = givens.filter((index) => !targeted.includes(index))
  return [...shuffled(targeted), ...shuffled(rest)]
}

function generateOpeningFreezeCandidate(options) {
  const solution = generateSolutionGrid()
  if (!solution) return { ok: false, reason: 'solution-generation-failed' }
  const clueCount = randomInt(options.minClues, options.maxClues)
  const puzzle = Array.from({ length: 9 }, () => Array(9).fill(0))
  for (const index of shuffled(Array.from({ length: 81 }, (_, cell) => cell)).slice(0, clueCount)) {
    puzzle[Math.floor(index / 9)][index % 9] = solution[Math.floor(index / 9)][index % 9]
  }
  const solved = solveGrid(puzzle.map((row) => row.slice()), 2)
  if (solved.count !== 1) return { ok: false, reason: `not-unique-${solved.count}` }

  const localOpening = getLogicalHint(puzzle.flat().map((value) => value || null))
  if (localOpening && !LOCAL_ADVANCED_OPENERS.has(localOpening.strategy)) {
    return { ok: false, reason: `opening-${localOpening.strategy}` }
  }
  return { ok: true, puzzle: gridToPuzzle(puzzle), solution: gridToPuzzle(solved.solution) }
}

function generateOpeningSearchCandidate(options) {
  const solution = generateSolutionGrid()
  if (!solution) return { ok: false, reason: 'solution-generation-failed' }
  const clueCount = randomInt(options.minClues, options.maxClues)
  let current = generateUniquePuzzleByDigging(solution, clueCount)
  let currentScore = openingScore(current)
  if (isOpeningAccepted(current)) return { ok: true, puzzle: gridToPuzzle(current), solution: gridToPuzzle(solution) }

  let best = current
  let bestScore = currentScore
  const steps = Math.max(1, options.searchSteps)
  for (let step = 0; step < steps; step += 1) {
    const givens = []
    const empties = []
    for (let index = 0; index < 81; index += 1) {
      const row = Math.floor(index / 9)
      const col = index % 9
      if (current[row][col]) givens.push(index)
      else empties.push(index)
    }
    if (!givens.length || !empties.length) break
    const removeIndex = givens[Math.floor(Math.random() * givens.length)]
    const addIndex = empties[Math.floor(Math.random() * empties.length)]
    const next = current.map((row) => row.slice())
    next[Math.floor(removeIndex / 9)][removeIndex % 9] = 0
    next[Math.floor(addIndex / 9)][addIndex % 9] = solution[Math.floor(addIndex / 9)][addIndex % 9]
    if (solveGrid(next.map((row) => row.slice()), 2).count !== 1) continue

    const nextScore = openingScore(next)
    const accept = nextScore.score >= currentScore.score || Math.random() < 0.04
    if (accept) {
      current = next
      currentScore = nextScore
    }
    if (nextScore.score > bestScore.score) {
      best = next
      bestScore = nextScore
    }
    if (isOpeningAccepted(next)) return { ok: true, puzzle: gridToPuzzle(next), solution: gridToPuzzle(solution) }
  }

  return { ok: false, reason: `opening-search-${bestScore.hint?.strategy || 'none'}-${bestScore.score}` }
}

function generateOpeningBuildCandidate(options) {
  const solution = generateSolutionGrid()
  if (!solution) return { ok: false, reason: 'solution-generation-failed' }
  const puzzle = Array.from({ length: 9 }, () => Array(9).fill(0))
  const emptyCells = new Set(Array.from({ length: 81 }, (_, index) => index))
  let clueCount = 0

  while (clueCount < options.maxClues) {
    let added = false
    for (const index of shuffled([...emptyCells])) {
      const row = Math.floor(index / 9)
      const col = index % 9
      const next = puzzle.map((line) => line.slice())
      next[row][col] = solution[row][col]
      if (!isBuildOpeningAllowed(next, options.buildMinScore)) continue
      puzzle[row][col] = solution[row][col]
      emptyCells.delete(index)
      clueCount += 1
      added = true
      break
    }
    if (!added) return { ok: false, reason: `opening-build-stuck-${clueCount}` }

    if (clueCount >= options.minClues) {
      const solved = solveGrid(puzzle.map((row) => row.slice()), 2)
      if (solved.count === 1 && isOpeningAccepted(puzzle)) return { ok: true, puzzle: gridToPuzzle(puzzle), solution: gridToPuzzle(solved.solution) }
    }
  }

  return { ok: false, reason: `opening-build-not-unique-${clueCount}` }
}

async function generateDesingleCandidate(options, generatedOptions) {
  const generated = await generateSudoku(generatedOptions)
  if (!generated?.puzzle) return { ok: false, reason: 'hodoku-empty' }
  let current = puzzleToGrid(generated.puzzle)
  let currentScore = openingScore(current)
  if (isOpeningAccepted(current)) return { ok: true, puzzle: gridToPuzzle(current), solution: generated.solution }

  let bestScore = currentScore
  for (let step = 0; step < options.searchSteps; step += 1) {
    const givens = []
    for (let index = 0; index < 81; index += 1) {
      if (current[Math.floor(index / 9)][index % 9]) givens.push(index)
    }
    if (givens.length <= options.minClues) break

    const removalOrder = targetedRemovalIndexes(current, currentScore.hint, givens)
    let bestMove = null
    for (const removeIndex of removalOrder.slice(0, 30)) {
      const next = current.map((row) => row.slice())
      next[Math.floor(removeIndex / 9)][removeIndex % 9] = 0
      const solved = solveGrid(next.map((row) => row.slice()), 2)
      if (solved.count !== 1) continue
      const nextScore = openingScore(next)
      if (!bestMove || nextScore.score > bestMove.score.score) bestMove = { grid: next, score: nextScore, solution: solved.solution }
      if (isOpeningAccepted(next)) return { ok: true, puzzle: gridToPuzzle(next), solution: gridToPuzzle(solved.solution) }
    }
    const empties = []
    for (let index = 0; index < 81; index += 1) {
      if (!current[Math.floor(index / 9)][index % 9]) empties.push(index)
    }
    for (const removeIndex of removalOrder.slice(0, 8)) {
      for (const addIndex of shuffled(empties).slice(0, 16)) {
        const next = current.map((row) => row.slice())
        next[Math.floor(removeIndex / 9)][removeIndex % 9] = 0
        next[Math.floor(addIndex / 9)][addIndex % 9] = Number(generated.solution[addIndex])
        const solved = solveGrid(next.map((row) => row.slice()), 2)
        if (solved.count !== 1) continue
        const nextScore = openingScore(next)
        if (!bestMove || nextScore.score > bestMove.score.score) bestMove = { grid: next, score: nextScore, solution: solved.solution }
        if (isOpeningAccepted(next)) return { ok: true, puzzle: gridToPuzzle(next), solution: gridToPuzzle(solved.solution) }
      }
    }
    if (!bestMove) break
    const accept = bestMove.score.score >= currentScore.score || Math.random() < 0.25
    if (!accept) break
    current = bestMove.grid
    currentScore = bestMove.score
    if (currentScore.score > bestScore.score) bestScore = currentScore
  }
  return { ok: false, reason: `de-single-${bestScore.hint?.strategy || 'none'}-${bestScore.score}` }
}

function hasBadPath(rating) {
  return Boolean(
    rating?.bruteForced
    || rating?.givenUp
    || rating?.unsolvable
    || rating?.steps?.some((step) => BAD_PATH_TECHNIQUES.has(step.technique)),
  )
}

function isHodokuAdvancedOpening(technique = '') {
  return HODOKU_ADVANCED_OPENERS.some((prefix) => technique.includes(prefix))
}

function firstActionStep(steps = []) {
  return steps.find((step) => step.actions?.length)
}

async function generateCandidate(options, generatedOptions) {
  if (options.source === 'hodoku') {
    const generated = await generateSudoku(generatedOptions)
    return generated?.puzzle ? { ok: true, puzzle: generated.puzzle, solution: generated.solution } : { ok: false, reason: 'hodoku-empty' }
  }
  if (options.source === 'de-single') return generateDesingleCandidate(options, generatedOptions)
  if (options.source === 'opening-search') return generateOpeningSearchCandidate(options)
  if (options.source === 'opening-build') return generateOpeningBuildCandidate(options)
  return generateOpeningFreezeCandidate(options)
}

async function validatePuzzle(puzzle, generated = null) {
  const rating = await rateSudoku({ puzzle, includePath: true, includeSolution: true })
  if (!rating || hasBadPath(rating)) {
    return { ok: false, reason: 'path-needs-search' }
  }

  const localOpening = getLogicalHint(boardFromPuzzle(puzzle))
  const pathOpening = firstActionStep(rating.steps)
  const localOpeningIsAdvanced = LOCAL_ADVANCED_OPENERS.has(localOpening?.strategy)
  const pathOpeningIsAdvanced = isHodokuAdvancedOpening(pathOpening?.technique)

  if (!localOpeningIsAdvanced && !pathOpeningIsAdvanced) {
    return { ok: false, reason: `opening-${localOpening?.strategy || pathOpening?.technique || 'none'}` }
  }

  const opening = localOpeningIsAdvanced ? localOpening.strategy : pathOpening.technique
  const techniques = [...new Set((rating.steps || []).map((step) => step.technique))]
  return {
    ok: true,
    entry: {
      puzzle,
      solution: rating.solution || generated?.solution || null,
      opening,
      difficulty: rating.difficulty,
      score: rating.score,
      pathLength: rating.steps?.length || 0,
      techniques,
      bruteForced: false,
      givenUp: false,
      createdAt: new Date().toISOString(),
    },
  }
}

function nextId(pool) {
  const maxNumber = pool.puzzles.reduce((max, puzzle) => {
    const match = String(puzzle.id || '').match(/HELL-(\d+)/)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  return `HELL-${String(maxNumber + 1).padStart(5, '0')}`
}

function writePool(outputPath, pool) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, `${JSON.stringify(pool, null, 2)}\n`)
}

async function main() {
  const options = parseArgs()
  const pool = loadPool(options.output)
  const seen = new Set(pool.puzzles.map((entry) => entry.puzzle))
  const generatedOptions = {
    difficulty: options.difficulty,
    minScore: Number.isFinite(options.minScore) ? options.minScore : undefined,
    maxScore: Number.isFinite(options.maxScore) ? options.maxScore : undefined,
  }
  let accepted = 0
  const deadline = Number.isFinite(options.maxRuntimeMinutes) && options.maxRuntimeMinutes > 0
    ? Date.now() + options.maxRuntimeMinutes * 60 * 1000
    : Infinity

  for (let attempt = 1; attempt <= options.attempts && accepted < options.targetAdditions; attempt += 1) {
    if (Date.now() >= deadline) {
      console.log(`stopping before workflow timeout after ${attempt - 1} attempts`)
      break
    }
    const generated = await generateCandidate(options, generatedOptions)
    if (!generated.ok) {
      if (attempt % 25 === 0) console.log(`attempt ${attempt}/${options.attempts}: ${generated.reason}`)
      continue
    }
    if (!generated.puzzle || seen.has(generated.puzzle)) continue

    const result = await validatePuzzle(generated.puzzle, generated)
    if (!result.ok) {
      if (attempt % 25 === 0) console.log(`attempt ${attempt}/${options.attempts}: ${result.reason}`)
      continue
    }

    result.entry.id = nextId(pool)
    pool.puzzles.push(result.entry)
    seen.add(result.entry.puzzle)
    accepted += 1
    console.log(`accepted ${result.entry.id}: ${result.entry.opening}, score ${result.entry.score}, path ${result.entry.pathLength}`)
  }

  if (accepted > 0 || !fs.existsSync(options.output)) {
    pool.generatedAt = new Date().toISOString()
    pool.puzzles.sort((a, b) => String(a.id).localeCompare(String(b.id)))
    writePool(options.output, pool)
  }
  console.log(`hell pool: +${accepted}, total ${pool.puzzles.length}, output ${path.relative(projectRoot, options.output)}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
