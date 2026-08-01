import assert from 'node:assert/strict'
import test from 'node:test'
import {
  findClaimingCandidate,
  findFish,
  findHiddenTriple,
  findJuniorExocet,
  findNakedTriple,
  findSkyscraper,
  findTwoStringKite,
  findXYZWing,
  findYWing,
  getLogicalHint,
} from './logicalHint.js'

function scenario(cells) {
  const board = Array(81).fill(1)
  const candidateMap = Array.from({ length: 81 }, () => [])
  for (const [index, candidates] of Object.entries(cells)) {
    board[Number(index)] = null
    candidateMap[Number(index)] = candidates
  }
  return { board, candidateMap }
}

function eliminations(hint) {
  return hint.updates.map(({ index, eliminatedCandidate }) => `${index}:${eliminatedCandidate}`).sort()
}

function legalCandidates(board) {
  return board.map((value, index) => {
    if (value) return []
    const row = Math.floor(index / 9)
    const column = index % 9
    const used = new Set()
    for (let offset = 0; offset < 9; offset += 1) {
      used.add(board[row * 9 + offset])
      used.add(board[offset * 9 + column])
    }
    const boxRow = Math.floor(row / 3) * 3
    const boxColumn = Math.floor(column / 3) * 3
    for (let boxR = boxRow; boxR < boxRow + 3; boxR += 1) {
      for (let boxC = boxColumn; boxC < boxColumn + 3; boxC += 1) used.add(board[boxR * 9 + boxC])
    }
    return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((digit) => !used.has(digit))
  })
}

test('naked triple removes its three digits from other cells in the house', () => {
  const { board, candidateMap } = scenario({ 0: [1, 2], 1: [1, 3], 2: [2, 3], 3: [1, 4] })
  const hint = findNakedTriple(board, candidateMap)
  assert.equal(hint.strategy, 'Naked Triple')
  assert.deepEqual(eliminations(hint), ['3:1'])
})

test('naked triple is rejected when four cells are confined to the same digits', () => {
  const { board, candidateMap } = scenario({ 0: [1, 2], 1: [1, 3], 2: [2, 3], 3: [1, 2, 3], 4: [1, 4, 5] })
  assert.equal(findNakedTriple(board, candidateMap), null)
})

test('hidden triple removes unrelated candidates from its three cells', () => {
  const { board, candidateMap } = scenario({ 9: [1, 2, 4], 10: [1, 3, 5], 11: [2, 3, 6], 12: [4, 5, 6] })
  const hint = findHiddenTriple(board, candidateMap)
  assert.equal(hint.strategy, 'Hidden Triple')
  assert.deepEqual(eliminations(hint), ['10:5', '11:6', '9:4'])
})

test('X-Wing eliminates a candidate from both cover columns', () => {
  const { board, candidateMap } = scenario({ 1: [7], 4: [7], 28: [7], 31: [7], 55: [7, 8], 67: [3, 7] })
  const hint = findFish(board, candidateMap, 2)
  assert.equal(hint.strategy, 'X-Wing')
  assert.deepEqual(eliminations(hint), ['55:7', '67:7'])
})

test('Y-Wing eliminates the shared wing candidate from common peers', () => {
  const { board, candidateMap } = scenario({ 10: [1, 9], 13: [7, 9], 37: [2, 9], 40: [2, 7] })
  const hint = findYWing(board, candidateMap)
  assert.equal(hint.strategy, 'Y-Wing')
  assert.deepEqual(eliminations(hint), ['10:9'])
})

test('Swordfish eliminates a candidate across its three cover columns', () => {
  const { board, candidateMap } = scenario({ 1: [5], 4: [5], 31: [5], 35: [5], 64: [5], 71: [5], 19: [2, 5], 49: [5, 8], 80: [1, 5] })
  const hint = findFish(board, candidateMap, 3)
  assert.equal(hint.strategy, 'Swordfish')
  assert.deepEqual(eliminations(hint), ['19:5', '49:5', '80:5'])
})

test('claiming candidate removes a line-confined digit from the rest of its box', () => {
  const { board, candidateMap } = scenario({ 0: [1, 5], 1: [2, 5], 9: [3, 5] })
  const hint = findClaimingCandidate(board, candidateMap)
  assert.equal(hint.strategy, 'Claiming Candidate')
  assert.deepEqual(eliminations(hint), ['9:5'])
})

test('Jellyfish eliminates a candidate from four cover columns', () => {
  const { board, candidateMap } = scenario({
    1: [9], 3: [9], 19: [9], 23: [9], 39: [9], 43: [9], 59: [9], 61: [9], 73: [4, 9],
  })
  const hint = findFish(board, candidateMap, 4)
  assert.equal(hint.strategy, 'Jellyfish')
  assert.deepEqual(eliminations(hint), ['73:9'])
})

test('Skyscraper removes a candidate seen by both roofs', () => {
  const { board, candidateMap } = scenario({ 0: [6], 4: [6], 27: [6], 32: [6], 14: [2, 6] })
  const hint = findSkyscraper(board, candidateMap)
  assert.equal(hint.strategy, 'Skyscraper')
  assert.deepEqual(eliminations(hint), ['14:6'])
})

test('Two-String Kite removes a candidate seen by both outer endpoints', () => {
  const { board, candidateMap } = scenario({ 0: [8], 4: [8], 10: [8], 46: [8], 49: [3, 8] })
  const hint = findTwoStringKite(board, candidateMap)
  assert.equal(hint.strategy, 'Two-String Kite')
  assert.deepEqual(eliminations(hint), ['49:8'])
})

test('XYZ-Wing removes its shared candidate from a cell seeing all three pattern cells', () => {
  const { board, candidateMap } = scenario({ 10: [1, 2, 3], 13: [1, 3], 20: [2, 3], 11: [3, 4] })
  const hint = findXYZWing(board, candidateMap)
  assert.equal(hint.strategy, 'XYZ-Wing')
  assert.deepEqual(eliminations(hint), ['11:3'])
})

test('the shared puzzle starts with a Junior Exocet elimination', () => {
  const board = [
    0, 0, 3, 0, 0, 6, 0, 8, 0,
    0, 0, 0, 1, 0, 0, 2, 0, 6,
    0, 0, 0, 0, 7, 0, 0, 0, 4,
    0, 0, 9, 0, 0, 8, 0, 6, 0,
    0, 3, 0, 0, 4, 0, 0, 0, 1,
    0, 7, 0, 2, 0, 0, 0, 0, 0,
    3, 0, 0, 0, 0, 5, 0, 0, 0,
    0, 0, 5, 0, 0, 0, 6, 0, 0,
    9, 8, 0, 0, 0, 0, 0, 5, 0,
  ]
  const hint = getLogicalHint(board)
  assert.equal(hint.strategy, 'Junior Exocet')
  assert.deepEqual(eliminations(hint), ['61:9', '77:3'])
})

test('Junior Exocet is rejected when a companion cell contains a base digit', () => {
  const board = [
    0, 0, 3, 0, 0, 6, 0, 8, 0,
    0, 0, 0, 1, 0, 0, 2, 0, 6,
    0, 0, 0, 0, 7, 0, 0, 0, 4,
    0, 0, 9, 0, 0, 8, 0, 6, 0,
    0, 3, 0, 0, 4, 0, 0, 0, 1,
    0, 7, 0, 2, 0, 0, 0, 0, 0,
    3, 0, 0, 0, 0, 5, 0, 0, 0,
    0, 0, 5, 0, 0, 0, 6, 0, 0,
    9, 8, 0, 0, 0, 0, 0, 0, 0,
  ]
  const candidateMap = legalCandidates(board)
  candidateMap[79] = [1, 5]
  assert.equal(findJuniorExocet(board, candidateMap), null)
})

test('a verified elimination is used by the following hint', () => {
  const board = [0, 0, 3, 5, 2, 8, 9, 7, 6, 5, 6, 8, 7, 9, 4, 2, 3, 1, 2, 9, 7, 1, 6, 3, 5, 4, 8, 0, 2, 5, 0, 7, 6, 8, 1, 9, 0, 0, 9, 0, 0, 1, 3, 0, 5, 8, 0, 0, 0, 5, 9, 4, 0, 7, 0, 5, 0, 0, 0, 2, 7, 9, 3, 0, 0, 2, 9, 1, 5, 6, 8, 4, 9, 8, 4, 6, 3, 7, 1, 5, 2]
  const notes = Array.from({ length: 81 }, () => [])
  const candidates = { 0: [1, 4], 1: [1, 4], 27: [3, 4], 30: [3, 4], 36: [4, 6, 7], 37: [4, 7], 39: [2, 4, 8], 40: [4, 8], 43: [2, 6], 46: [1, 3], 47: [1, 6], 48: [2, 3], 52: [2, 6], 54: [1, 6], 56: [1, 6], 57: [4, 8], 58: [4, 8], 63: [3, 7], 64: [3, 7] }
  for (const [index, values] of Object.entries(candidates)) notes[Number(index)] = values

  const firstHint = getLogicalHint(board)
  assert.equal(firstHint.strategy, 'Y-Wing')
  assert.deepEqual(eliminations(firstHint), ['1:1'])

  notes[1] = [4]
  const nextHint = getLogicalHint(board, notes)
  assert.equal(nextHint.strategy, 'Naked Single')
  assert.equal(nextHint.updates[0].index, 1)
  assert.equal(nextHint.updates[0].filledValue, 4)
})
