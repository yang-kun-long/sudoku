import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')
const workerScript = path.join(__dirname, 'generateHellPool.mjs')
const defaultOutput = path.join(projectRoot, 'src/data/hell/verified.json')
const defaultTempDir = path.join(projectRoot, '.hell-pool-work')

function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    attempts: 2000,
    targetAdditions: 20,
    workers: Math.min(Math.max(os.cpus().length - 1, 1), 6),
    difficulty: 'Extreme',
    output: defaultOutput,
    maxRuntimeMinutes: 0,
    source: 'opening-search',
    minClues: 24,
    maxClues: 30,
    searchSteps: 160,
    buildMinScore: 10,
    minScore: undefined,
    maxScore: undefined,
    tempDir: defaultTempDir,
  }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    const readValue = () => args[++index]
    if (arg === '--attempts') options.attempts = Number(readValue())
    else if (arg === '--target-additions') options.targetAdditions = Number(readValue())
    else if (arg === '--workers') options.workers = Number(readValue())
    else if (arg === '--difficulty') options.difficulty = readValue()
    else if (arg === '--output') options.output = path.resolve(projectRoot, readValue())
    else if (arg === '--max-runtime-minutes') options.maxRuntimeMinutes = Number(readValue())
    else if (arg === '--source') options.source = readValue()
    else if (arg === '--min-clues') options.minClues = Number(readValue())
    else if (arg === '--max-clues') options.maxClues = Number(readValue())
    else if (arg === '--search-steps') options.searchSteps = Number(readValue())
    else if (arg === '--build-min-score') options.buildMinScore = Number(readValue())
    else if (arg === '--min-score') options.minScore = Number(readValue())
    else if (arg === '--max-score') options.maxScore = Number(readValue())
    else if (arg === '--temp-dir') options.tempDir = path.resolve(projectRoot, readValue())
    else if (arg === '--help') {
      console.log('Usage: node scripts/generateHellPoolParallel.mjs [--attempts 2000] [--target-additions 20] [--workers 4] [--difficulty Extreme] [--source hodoku|de-single|opening-freeze|opening-search|opening-build] [--min-clues 24] [--max-clues 30] [--search-steps 160] [--build-min-score 10] [--max-runtime-minutes 0]')
      process.exit(0)
    }
  }
  options.workers = Math.max(1, Math.floor(options.workers))
  options.attempts = Math.max(1, Math.floor(options.attempts))
  options.targetAdditions = Math.max(1, Math.floor(options.targetAdditions))
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

function writePool(outputPath, pool) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, `${JSON.stringify(pool, null, 2)}\n`)
}

function nextId(pool) {
  const maxNumber = pool.puzzles.reduce((max, puzzle) => {
    const match = String(puzzle.id || '').match(/HELL-(\d+)/)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0)
  return `HELL-${String(maxNumber + 1).padStart(5, '0')}`
}

function runWorker(workerIndex, options, workerAttempts, workerTarget, outputPath) {
  const args = [
    workerScript,
    '--attempts', String(workerAttempts),
    '--target-additions', String(workerTarget),
    '--difficulty', options.difficulty,
    '--source', options.source,
    '--min-clues', String(options.minClues),
    '--max-clues', String(options.maxClues),
    '--search-steps', String(options.searchSteps),
    '--build-min-score', String(options.buildMinScore),
    '--output', path.relative(projectRoot, outputPath),
  ]
  if (Number.isFinite(options.maxRuntimeMinutes) && options.maxRuntimeMinutes > 0) {
    args.push('--max-runtime-minutes', String(options.maxRuntimeMinutes))
  }
  if (Number.isFinite(options.minScore)) args.push('--min-score', String(options.minScore))
  if (Number.isFinite(options.maxScore)) args.push('--max-score', String(options.maxScore))

  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: projectRoot, stdio: ['ignore', 'pipe', 'pipe'] })
    child.stdout.on('data', (chunk) => process.stdout.write(`[w${workerIndex}] ${chunk}`))
    child.stderr.on('data', (chunk) => process.stderr.write(`[w${workerIndex}] ${chunk}`))
    child.on('close', (code) => resolve({ workerIndex, code, outputPath }))
  })
}

async function main() {
  const options = parseArgs()
  fs.rmSync(options.tempDir, { recursive: true, force: true })
  fs.mkdirSync(options.tempDir, { recursive: true })

  const attemptsPerWorker = Math.ceil(options.attempts / options.workers)
  const targetPerWorker = Math.ceil(options.targetAdditions / options.workers)
  console.log(`parallel hell pool: ${options.workers} workers, ${options.attempts} attempts, target ${options.targetAdditions}`)

  const workerRuns = Array.from({ length: options.workers }, (_, index) => {
    const remaining = options.attempts - attemptsPerWorker * index
    const workerAttempts = Math.max(0, Math.min(attemptsPerWorker, remaining))
    const outputPath = path.join(options.tempDir, `worker-${index + 1}.json`)
    return workerAttempts > 0 ? runWorker(index + 1, options, workerAttempts, targetPerWorker, outputPath) : null
  }).filter(Boolean)

  const results = await Promise.all(workerRuns)
  const failed = results.filter((result) => result.code !== 0)
  if (failed.length) {
    console.error(`${failed.length} worker(s) failed`)
    process.exit(1)
  }

  const pool = loadPool(options.output)
  const seen = new Set(pool.puzzles.map((entry) => entry.puzzle))
  let added = 0
  for (const result of results) {
    if (!fs.existsSync(result.outputPath)) continue
    const workerPool = loadPool(result.outputPath)
    for (const entry of workerPool.puzzles) {
      if (seen.has(entry.puzzle) || added >= options.targetAdditions) continue
      pool.puzzles.push({ ...entry, id: nextId(pool), createdAt: new Date().toISOString() })
      seen.add(entry.puzzle)
      added += 1
    }
  }

  if (added > 0 || !fs.existsSync(options.output)) {
    pool.generatedAt = new Date().toISOString()
    pool.puzzles.sort((a, b) => String(a.id).localeCompare(String(b.id)))
    writePool(options.output, pool)
  }
  fs.rmSync(options.tempDir, { recursive: true, force: true })
  console.log(`parallel hell pool: +${added}, total ${pool.puzzles.length}, output ${path.relative(projectRoot, options.output)}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
