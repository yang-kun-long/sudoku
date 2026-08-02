import { DATASET_SOURCE, DIFFICULTIES, candidates, decodePuzzle, encodePuzzle, getDatasetPuzzle, ratePuzzle, solve } from './sudoku.js'

const CELL_COUNT = 81
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

function toBase64Url(bytes) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function fromBase64Url(value) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4)
  const binary = atob(normalized)
  return Array.from(binary, (character) => character.charCodeAt(0))
}

function createBitWriter() {
  const bytes = []
  let accumulator = 0
  let bitCount = 0
  return {
    write(value, width) {
      accumulator |= value << bitCount
      bitCount += width
      while (bitCount >= 8) {
        bytes.push(accumulator & 255)
        accumulator >>= 8
        bitCount -= 8
      }
    },
    finish() {
      if (bitCount) bytes.push(accumulator & 255)
      return bytes
    },
  }
}

function createBitReader(bytes) {
  let byteIndex = 0
  let accumulator = 0
  let bitCount = 0
  return {
    read(width) {
      while (bitCount < width) {
        if (byteIndex >= bytes.length) return null
        accumulator |= bytes[byteIndex] << bitCount
        byteIndex += 1
        bitCount += 8
      }
      const mask = (1 << width) - 1
      const value = accumulator & mask
      accumulator >>= width
      bitCount -= width
      return value
    },
  }
}

function flatToGrid(values) {
  return Array.from({ length: 9 }, (_, row) => values.slice(row * 9, row * 9 + 9))
}

function normalizeDigit(value) {
  const number = Number(value)
  return Number.isInteger(number) && number >= 1 && number <= 9 ? number : 0
}

function normalizeDigits(values) {
  if (!Array.isArray(values) || values.length !== CELL_COUNT) return null
  return values.map(normalizeDigit)
}

function maskFromNotes(cellNotes) {
  if (!Array.isArray(cellNotes)) return 0
  return cellNotes.reduce((mask, digit) => {
    const number = normalizeDigit(digit)
    return number ? mask | (1 << (number - 1)) : mask
  }, 0)
}

function notesFromMask(mask) {
  return DIGITS.filter((digit) => mask & (1 << (digit - 1)))
}

function noteMasks(notes) {
  if (!Array.isArray(notes) || notes.length !== CELL_COUNT) return null
  return notes.map(maskFromNotes)
}

function encodeMaskList(masks) {
  const writer = createBitWriter()
  for (const mask of masks) writer.write(mask, 9)
  return toBase64Url(writer.finish())
}

function decodeMaskList(payload) {
  const reader = createBitReader(fromBase64Url(payload))
  const masks = []
  for (let index = 0; index < CELL_COUNT; index += 1) {
    const mask = reader.read(9)
    if (mask === null || mask > 511) return null
    masks.push(mask)
  }
  return masks
}

function encodeSparseMasks(masks) {
  const filled = masks.map((mask, index) => ({ index, mask })).filter(({ mask }) => mask)
  const writer = createBitWriter()
  writer.write(filled.length, 7)
  for (const item of filled) {
    writer.write(item.index, 7)
    writer.write(item.mask, 9)
  }
  return toBase64Url(writer.finish())
}

function decodeSparseMasks(payload) {
  const reader = createBitReader(fromBase64Url(payload))
  const count = reader.read(7)
  if (count === null || count > CELL_COUNT) return null
  const masks = Array(CELL_COUNT).fill(0)
  for (let offset = 0; offset < count; offset += 1) {
    const index = reader.read(7)
    const mask = reader.read(9)
    if (index === null || mask === null || index >= CELL_COUNT || mask > 511) return null
    masks[index] = mask
  }
  return masks
}

function getSmartMasks(puzzle, entries) {
  const currentGrid = Array.from({ length: 9 }, (_, row) => Array.from({ length: 9 }, (_, col) => puzzle[row][col] || entries[row * 9 + col] || 0))
  return Array.from({ length: CELL_COUNT }, (_, index) => {
    const row = Math.floor(index / 9)
    const col = index % 9
    if (currentGrid[row][col]) return 0
    return maskFromNotes(candidates(currentGrid, row, col))
  })
}

function encodeDeltaMasks(masks, puzzle, entries) {
  const smartMasks = getSmartMasks(puzzle, entries)
  const changed = masks.map((mask, index) => ({
    index,
    removed: smartMasks[index] & ~mask,
    added: mask & ~smartMasks[index],
  })).filter(({ removed, added }) => removed || added)
  const writer = createBitWriter()
  writer.write(changed.length, 7)
  for (const item of changed) {
    writer.write(item.index, 7)
    writer.write(item.removed, 9)
    writer.write(item.added, 9)
  }
  return toBase64Url(writer.finish())
}

function decodeDeltaMasks(payload, puzzle, entries) {
  const reader = createBitReader(fromBase64Url(payload))
  const count = reader.read(7)
  if (count === null || count > CELL_COUNT) return null
  const masks = getSmartMasks(puzzle, entries)
  for (let offset = 0; offset < count; offset += 1) {
    const index = reader.read(7)
    const removed = reader.read(9)
    const added = reader.read(9)
    if (index === null || removed === null || added === null || index >= CELL_COUNT || removed > 511 || added > 511) return null
    masks[index] = (masks[index] & ~removed) | added
  }
  return masks
}

function masksToNotes(masks) {
  return masks.map(notesFromMask)
}

function selectShortest(payloads) {
  return payloads.filter(Boolean).sort((a, b) => a.length - b.length)[0]
}

export function encodeEntries(entries) {
  const digits = normalizeDigits(entries)
  if (!digits) return null
  if (digits.every((digit) => !digit)) return 'e.0'
  const filled = digits.map((digit, index) => ({ index, digit })).filter(({ digit }) => digit)
  const writer = createBitWriter()
  writer.write(filled.length, 7)
  for (const item of filled) {
    writer.write(item.index, 7)
    writer.write(item.digit, 4)
  }
  return selectShortest([
    `e.s.${toBase64Url(writer.finish())}`,
    `e.f.${encodePuzzle(flatToGrid(digits))}`,
  ])
}

export function decodeEntries(payload) {
  if (payload === 'e.0') return Array(CELL_COUNT).fill(0)
  if (payload.startsWith('e.f.')) return decodePuzzle(payload.slice(4))?.flat() || null
  if (!payload.startsWith('e.s.')) return null
  const reader = createBitReader(fromBase64Url(payload.slice(4)))
  const count = reader.read(7)
  if (count === null || count > CELL_COUNT) return null
  const entries = Array(CELL_COUNT).fill(0)
  for (let offset = 0; offset < count; offset += 1) {
    const index = reader.read(7)
    const digit = reader.read(4)
    if (index === null || digit === null || index >= CELL_COUNT || digit < 1 || digit > 9) return null
    entries[index] = digit
  }
  return entries
}

export function encodeNotes(notes, puzzle, entries) {
  const masks = noteMasks(notes)
  if (!masks) return null
  if (masks.every((mask) => !mask)) return 'n.0'
  return selectShortest([
    `n.s.${encodeSparseMasks(masks)}`,
    `n.d.${encodeDeltaMasks(masks, puzzle, entries)}`,
    `n.f.${encodeMaskList(masks)}`,
  ])
}

export function decodeNotes(payload, puzzle, entries) {
  if (payload === 'n.0') return Array.from({ length: CELL_COUNT }, () => [])
  let masks = null
  if (payload.startsWith('n.s.')) masks = decodeSparseMasks(payload.slice(4))
  else if (payload.startsWith('n.d.')) masks = decodeDeltaMasks(payload.slice(4), puzzle, entries)
  else if (payload.startsWith('n.f.')) masks = decodeMaskList(payload.slice(4))
  return masks ? masksToNotes(masks) : null
}

function encodeQuestion(puzzle, puzzleId) {
  const encodedPuzzle = encodePuzzle(puzzle)
  if (puzzleId?.startsWith('GH-') || puzzleId?.startsWith('NS-')) return `q.d.${puzzleId}`
  if (puzzleId?.startsWith('HELL-')) return `q.h.${encodedPuzzle}`
  if (puzzleId === 'MANUAL') return `q.m.${encodedPuzzle}`
  return `q.p.${encodedPuzzle}`
}

function decodeQuestion(payload) {
  if (payload.startsWith('q.d.')) {
    const shared = getDatasetPuzzle(payload.slice(4))
    if (!shared) return null
    return {
      puzzle: shared.puzzle,
      solution: shared.solution,
      id: shared.id,
      sourceChoice: shared.source === 'human' ? 'human' : 'nullsudoku',
      sourceLabel: shared.source === 'human' ? DATASET_SOURCE : 'NullSudoku 题库',
      difficulty: shared.level,
      ratingLabel: DIFFICULTIES[shared.level]?.label || ratePuzzle(shared.puzzle),
    }
  }
  const type = payload.slice(2, 3)
  if (!payload.startsWith(`q.${type}.`) || !['p', 'h', 'm'].includes(type)) return null
  const puzzle = decodePuzzle(payload.slice(4))
  if (!puzzle) return null
  const result = solve(puzzle.map((row) => row.slice()), 2)
  if (result.count !== 1 || !result.solution) return null
  if (type === 'h') {
    return {
      puzzle,
      solution: result.solution,
      id: 'HELL-SHARED',
      sourceChoice: 'generated',
      sourceLabel: '分享地狱题目：HoDoKu 高分逻辑题，完整路径无搜索',
      difficulty: 'hell',
      ratingLabel: DIFFICULTIES.hell.label,
    }
  }
  if (type === 'm') {
    return {
      puzzle,
      solution: result.solution,
      id: 'MANUAL-SHARED',
      sourceChoice: 'manual',
      sourceLabel: '手动输入分享进度',
      difficulty: null,
      ratingLabel: ratePuzzle(puzzle),
    }
  }
  return {
    puzzle,
    solution: result.solution,
    id: 'SHARED',
    sourceChoice: 'generated',
    sourceLabel: '分享进度',
    difficulty: null,
    ratingLabel: ratePuzzle(puzzle),
  }
}

function toBase36Number(value) {
  const number = Math.max(0, Math.floor(Number(value) || 0))
  return number.toString(36)
}

function fromBase36Number(value) {
  const number = Number.parseInt(value, 36)
  return Number.isFinite(number) && number >= 0 ? number : 0
}

export function encodeSharedState(state) {
  if (state.manualEditing) return null
  const entriesPayload = encodeEntries(state.entries)
  const notesPayload = encodeNotes(state.notes, state.puzzle, state.entries)
  if (!entriesPayload || !notesPayload) return null
  return [
    'v1',
    encodeQuestion(state.puzzle, state.puzzleId),
    entriesPayload,
    notesPayload,
    `t.${toBase36Number(state.seconds)}`,
    `m.${toBase36Number(state.mistakes)}`,
    `h.${toBase36Number(state.hintCount)}`,
    `s.${state.smartCandidatesEnabled ? 1 : 0}`,
  ].join('~')
}

export function decodeSharedState(raw) {
  try {
    const parts = raw.split('~')
    if (parts[0] !== 'v1') return null
    const question = decodeQuestion(parts.find((part) => part.startsWith('q.')) || '')
    if (!question) return null
    const entries = decodeEntries(parts.find((part) => part.startsWith('e.')) || '')
    if (!entries) return null
    const notes = decodeNotes(parts.find((part) => part.startsWith('n.')) || '', question.puzzle, entries)
    if (!notes) return null
    return {
      ...question,
      entries,
      notes,
      seconds: fromBase36Number((parts.find((part) => part.startsWith('t.')) || 't.0').slice(2)),
      mistakes: fromBase36Number((parts.find((part) => part.startsWith('m.')) || 'm.0').slice(2)),
      hintCount: fromBase36Number((parts.find((part) => part.startsWith('h.')) || 'h.0').slice(2)),
      smartCandidatesEnabled: (parts.find((part) => part.startsWith('s.')) || 's.0').slice(2) === '1',
    }
  } catch {
    return null
  }
}
