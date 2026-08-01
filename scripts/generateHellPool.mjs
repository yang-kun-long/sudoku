import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { generateSudoku, rateSudoku } from 'hodoku-core-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const defaultOutput = path.join(projectRoot, 'src/data/hell/verified.json')

const BAD_PATH_TECHNIQUES = new Set(['Brute Force', 'Give Up', 'Incomplete Solution'])
const ADVANCED_TECHNIQUES = [
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
  'Skyscraper',
  '2-String Kite',
  'XY-Wing',
  'XYZ-Wing',
  'Swordfish',
  'Jellyfish',
]

function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    attempts: 200,
    targetAdditions: 5,
    difficulty: 'Extreme',
    output: defaultOutput,
    minScore: 1800,
    maxScore: undefined,
    maxRuntimeMinutes: 50,
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
    else if (arg === '--source') {
      const source = readValue()
      if (source !== 'hodoku') throw new Error('Only --source hodoku is supported by the production hell-pool generator.')
    } else if (arg === '--help') {
      console.log('Usage: node scripts/generateHellPool.mjs [--attempts 500] [--target-additions 10] [--difficulty Extreme] [--min-score 1800] [--max-score 99999] [--max-runtime-minutes 50]')
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
      difficulty: 'Extreme',
      allowBruteForce: false,
      allowGiveUp: false,
      allowIncomplete: false,
      minScore: 1800,
      notes: 'Puzzles must be high-scoring HoDoKu Extreme puzzles with a complete human-solvable path and no Brute Force, Give Up, or Incomplete Solution steps.',
    },
    puzzles: [],
  }
}

function loadPool(outputPath) {
  if (!fs.existsSync(outputPath)) return emptyPool()
  const parsed = JSON.parse(fs.readFileSync(outputPath, 'utf8'))
  return { ...emptyPool(), ...parsed, puzzles: Array.isArray(parsed.puzzles) ? parsed.puzzles : [] }
}

function hasBadPath(rating) {
  return Boolean(
    rating?.bruteForced
    || rating?.givenUp
    || rating?.unsolvable
    || rating?.steps?.some((step) => BAD_PATH_TECHNIQUES.has(step.technique)),
  )
}

function isAdvancedTechnique(technique = '') {
  return ADVANCED_TECHNIQUES.some((name) => technique.includes(name))
}

function validateRating(rating, generated, options) {
  if (!rating || hasBadPath(rating)) return { ok: false, reason: 'path-needs-search' }
  if (options.difficulty && rating.difficulty !== options.difficulty) return { ok: false, reason: `difficulty-${rating.difficulty}` }
  if (Number.isFinite(options.minScore) && rating.score < options.minScore) return { ok: false, reason: `score-${rating.score}` }
  if (Number.isFinite(options.maxScore) && rating.score > options.maxScore) return { ok: false, reason: `score-${rating.score}` }

  const actionSteps = (rating.steps || []).filter((step) => step.actions?.length)
  const firstAdvancedIndex = actionSteps.findIndex((step) => isAdvancedTechnique(step.technique))
  const techniques = [...new Set((rating.steps || []).map((step) => step.technique))]
  return {
    ok: true,
    entry: {
      puzzle: rating.puzzle || generated.puzzle,
      solution: rating.solution || generated.solution || null,
      opening: firstAdvancedIndex >= 0 ? actionSteps[firstAdvancedIndex].technique : actionSteps[0]?.technique || 'Logical Path',
      difficulty: rating.difficulty,
      score: rating.score,
      pathLength: rating.steps?.length || 0,
      firstStep: actionSteps[0]?.technique || null,
      advancedStepIndex: firstAdvancedIndex >= 0 ? firstAdvancedIndex + 1 : null,
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
  const deadline = Number.isFinite(options.maxRuntimeMinutes) && options.maxRuntimeMinutes > 0
    ? Date.now() + options.maxRuntimeMinutes * 60 * 1000
    : Infinity
  let accepted = 0

  for (let attempt = 1; attempt <= options.attempts && accepted < options.targetAdditions; attempt += 1) {
    if (Date.now() >= deadline) {
      console.log(`stopping before workflow timeout after ${attempt - 1} attempts`)
      break
    }
    const generated = await generateSudoku(generatedOptions)
    if (!generated?.puzzle || seen.has(generated.puzzle)) continue

    const rating = await rateSudoku({ puzzle: generated.puzzle, includePath: true, includeSolution: true })
    const result = validateRating(rating, generated, options)
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
    pool.criteria = { ...emptyPool().criteria, minScore: options.minScore, difficulty: options.difficulty }
    pool.puzzles.sort((a, b) => String(a.id).localeCompare(String(b.id)))
    writePool(options.output, pool)
  }
  console.log(`hell pool: +${accepted}, total ${pool.puzzles.length}, output ${path.relative(projectRoot, options.output)}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
