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

function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    attempts: 200,
    targetAdditions: 5,
    difficulty: 'Extreme',
    output: defaultOutput,
    minScore: undefined,
    maxScore: undefined,
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
    else if (arg === '--help') {
      console.log('Usage: node scripts/generateHellPool.mjs [--attempts 500] [--target-additions 10] [--difficulty Extreme] [--min-score 2000] [--max-score 99999]')
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

  for (let attempt = 1; attempt <= options.attempts && accepted < options.targetAdditions; attempt += 1) {
    const generated = await generateSudoku(generatedOptions)
    if (!generated?.puzzle || seen.has(generated.puzzle)) continue

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
