const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

const cellName = (index) => `第 ${Math.floor(index / 9) + 1} 行第 ${index % 9 + 1} 列`

function candidateList(board, index) {
  if (board[index]) return []
  const row = Math.floor(index / 9)
  const col = index % 9
  const used = new Set()
  for (let offset = 0; offset < 9; offset += 1) {
    used.add(board[row * 9 + offset])
    used.add(board[offset * 9 + col])
  }
  const boxRow = Math.floor(row / 3) * 3
  const boxCol = Math.floor(col / 3) * 3
  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) used.add(board[r * 9 + c])
  }
  return DIGITS.filter((number) => !used.has(number))
}

function createHouses() {
  const houses = []
  for (let row = 0; row < 9; row += 1) {
    houses.push({ type: 'row', label: `第 ${row + 1} 行`, cells: DIGITS.map((_, col) => row * 9 + col) })
  }
  for (let col = 0; col < 9; col += 1) {
    houses.push({ type: 'column', label: `第 ${col + 1} 列`, cells: DIGITS.map((_, row) => row * 9 + col) })
  }
  for (let box = 0; box < 9; box += 1) {
    const boxRow = Math.floor(box / 3) * 3
    const boxCol = (box % 3) * 3
    const cells = []
    for (let row = boxRow; row < boxRow + 3; row += 1) {
      for (let col = boxCol; col < boxCol + 3; col += 1) cells.push(row * 9 + col)
    }
    houses.push({ type: 'box', label: `第 ${box + 1} 宫`, cells })
  }
  return houses
}

const HOUSES = createHouses()

function valueHint(strategy, index, value, message, cells = [index]) {
  return { strategy, type: 'value', updates: [{ index, filledValue: value }], cells, message }
}

function eliminationHint(strategy, updates, cells, message) {
  return { strategy, type: 'elimination', updates, cells: [...new Set(cells)], message }
}

function combinations(items, size) {
  const results = []
  function collect(start, selected) {
    if (selected.length === size) {
      results.push(selected.slice())
      return
    }
    for (let index = start; index <= items.length - (size - selected.length); index += 1) {
      selected.push(items[index])
      collect(index + 1, selected)
      selected.pop()
    }
  }
  collect(0, [])
  return results
}

function arePeers(first, second) {
  if (first === second) return false
  const firstRow = Math.floor(first / 9)
  const firstCol = first % 9
  const secondRow = Math.floor(second / 9)
  const secondCol = second % 9
  return firstRow === secondRow || firstCol === secondCol || (Math.floor(firstRow / 3) === Math.floor(secondRow / 3) && Math.floor(firstCol / 3) === Math.floor(secondCol / 3))
}

function findOpenSingle(board, candidateMap) {
  for (const house of HOUSES) {
    const emptyCells = house.cells.filter((index) => !board[index])
    if (emptyCells.length !== 1) continue
    const index = emptyCells[0]
    const possible = candidateMap[index]
    if (possible.length === 1) {
      return valueHint('Open Single', index, possible[0], `${house.label}只剩 ${cellName(index)} 一个空格，用缺数法即可确定。`)
    }
  }
  return null
}

function findNakedSingle(board, candidateMap) {
  for (let index = 0; index < 81; index += 1) {
    if (!board[index] && candidateMap[index].length === 1) {
      return valueHint('Naked Single', index, candidateMap[index][0], `${cellName(index)} 的其他数字都已被同行、同列或同宫排除，只剩一个合法候选。`)
    }
  }
  return null
}

function findHiddenSingle(board, candidateMap) {
  for (const house of HOUSES) {
    const emptyCells = house.cells.filter((index) => !board[index])
    for (const digit of DIGITS) {
      const possibleCells = emptyCells.filter((index) => candidateMap[index].includes(digit))
      if (possibleCells.length === 1) {
        const index = possibleCells[0]
        return valueHint('Hidden Single', index, digit, `${house.label}中有一个缺失数字只能够放在 ${cellName(index)}，这是该区域的唯一位置。`)
      }
    }
  }
  return null
}

function findNakedPair(board, candidateMap) {
  for (const house of HOUSES) {
    const pairs = new Map()
    for (const index of house.cells) {
      if (board[index] || candidateMap[index].length !== 2) continue
      const key = candidateMap[index].join(',')
      pairs.set(key, [...(pairs.get(key) || []), index])
    }
    for (const [key, pairCells] of pairs) {
      if (pairCells.length !== 2) continue
      const pairDigits = key.split(',').map(Number)
      const updates = []
      for (const index of house.cells) {
        if (board[index] || pairCells.includes(index)) continue
        for (const digit of pairDigits) {
          if (candidateMap[index].includes(digit)) updates.push({ index, eliminatedCandidate: digit })
        }
      }
      if (updates.length) {
        return eliminationHint(
          'Naked Pair',
          updates,
          [...pairCells, ...updates.map((update) => update.index)],
          `${house.label}中的 ${cellName(pairCells[0])} 和 ${cellName(pairCells[1])} 只能填写 ${pairDigits.join('、')}，因此该区域其他格可以排除这两个候选。`,
        )
      }
    }
  }
  return null
}

function findHiddenPair(board, candidateMap) {
  for (const house of HOUSES) {
    const emptyCells = house.cells.filter((index) => !board[index])
    const positions = new Map(DIGITS.map((digit) => [digit, emptyCells.filter((index) => candidateMap[index].includes(digit))]))
    for (let first = 1; first <= 8; first += 1) {
      for (let second = first + 1; second <= 9; second += 1) {
        const firstCells = positions.get(first)
        const secondCells = positions.get(second)
        if (firstCells.length !== 2 || secondCells.length !== 2 || firstCells.some((index, offset) => index !== secondCells[offset])) continue
        const updates = []
        for (const index of firstCells) {
          for (const digit of candidateMap[index]) {
            if (digit !== first && digit !== second) updates.push({ index, eliminatedCandidate: digit })
          }
        }
        if (updates.length) {
          return eliminationHint(
            'Hidden Pair',
            updates,
            firstCells,
            `${house.label}中的候选 ${first}、${second} 只出现在 ${cellName(firstCells[0])} 和 ${cellName(firstCells[1])}，因此这两格可以排除其他候选。`,
          )
        }
      }
    }
  }
  return null
}

function findLockedCandidate(board, candidateMap) {
  const boxes = HOUSES.filter((house) => house.type === 'box')
  for (const box of boxes) {
    for (const digit of DIGITS) {
      const sourceCells = box.cells.filter((index) => !board[index] && candidateMap[index].includes(digit))
      if (sourceCells.length < 2) continue
      const rows = new Set(sourceCells.map((index) => Math.floor(index / 9)))
      const columns = new Set(sourceCells.map((index) => index % 9))
      const target = rows.size === 1
        ? HOUSES.find((house) => house.type === 'row' && Math.floor(house.cells[0] / 9) === Math.floor(sourceCells[0] / 9))
        : columns.size === 1
          ? HOUSES.find((house) => house.type === 'column' && house.cells[0] % 9 === sourceCells[0] % 9)
          : null
      if (!target) continue
      const updates = target.cells
        .filter((index) => !box.cells.includes(index) && !board[index] && candidateMap[index].includes(digit))
        .map((index) => ({ index, eliminatedCandidate: digit }))
      if (updates.length) {
        return eliminationHint(
          'Locked Candidate',
          updates,
          [...sourceCells, ...updates.map((update) => update.index)],
          `${box.label}中的候选 ${digit} 被限制在同一${rows.size === 1 ? '行' : '列'}，因此该${rows.size === 1 ? '行' : '列'}位于宫外的其他格可以排除 ${digit}。`,
        )
      }
    }
  }
  return null
}

export function findClaimingCandidate(board, candidateMap) {
  const lineHouses = HOUSES.filter((house) => house.type === 'row' || house.type === 'column')
  const boxes = HOUSES.filter((house) => house.type === 'box')
  for (const house of lineHouses) {
    for (const digit of DIGITS) {
      const sourceCells = house.cells.filter((index) => !board[index] && candidateMap[index].includes(digit))
      if (sourceCells.length < 2) continue
      const boxIndexes = new Set(sourceCells.map((index) => Math.floor(Math.floor(index / 9) / 3) * 3 + Math.floor((index % 9) / 3)))
      if (boxIndexes.size !== 1) continue
      const box = boxes[[...boxIndexes][0]]
      const updates = box.cells
        .filter((index) => !house.cells.includes(index) && !board[index] && candidateMap[index].includes(digit))
        .map((index) => ({ index, eliminatedCandidate: digit }))
      if (updates.length) {
        return eliminationHint(
          'Claiming Candidate',
          updates,
          [...sourceCells, ...updates.map((update) => update.index)],
          `${house.label}中的候选 ${digit} 全部被限制在${box.label}内，因此该宫位于这条${house.type === 'row' ? '行' : '列'}之外的格可以排除 ${digit}。`,
        )
      }
    }
  }
  return null
}

export function findNakedTriple(board, candidateMap) {
  for (const house of HOUSES) {
    const eligible = house.cells.filter((index) => !board[index] && candidateMap[index].length >= 2 && candidateMap[index].length <= 3)
    for (const tripleCells of combinations(eligible, 3)) {
      const tripleDigits = [...new Set(tripleCells.flatMap((index) => candidateMap[index]))].sort((a, b) => a - b)
      if (tripleDigits.length !== 3) continue
      const confinedCells = house.cells.filter((index) => !board[index] && candidateMap[index].length && candidateMap[index].every((digit) => tripleDigits.includes(digit)))
      if (confinedCells.length !== 3 || tripleCells.some((index) => !confinedCells.includes(index))) continue
      const updates = []
      for (const index of house.cells) {
        if (board[index] || tripleCells.includes(index)) continue
        for (const digit of tripleDigits) {
          if (candidateMap[index].includes(digit)) updates.push({ index, eliminatedCandidate: digit })
        }
      }
      if (updates.length) {
        return eliminationHint(
          'Naked Triple',
          updates,
          [...tripleCells, ...updates.map((update) => update.index)],
          `${house.label}中的三个高亮格只包含候选 ${tripleDigits.join('、')}，这三个数字必定占据这三格，因此该区域其他格可以排除这些候选。`,
        )
      }
    }
  }
  return null
}

export function findHiddenTriple(board, candidateMap) {
  for (const house of HOUSES) {
    const emptyCells = house.cells.filter((index) => !board[index])
    const positions = new Map(DIGITS.map((digit) => [digit, emptyCells.filter((index) => candidateMap[index].includes(digit))]))
    for (const tripleDigits of combinations(DIGITS, 3)) {
      if (tripleDigits.some((digit) => positions.get(digit).length === 0)) continue
      const tripleCells = [...new Set(tripleDigits.flatMap((digit) => positions.get(digit)))].sort((a, b) => a - b)
      if (tripleCells.length !== 3) continue
      const updates = []
      for (const index of tripleCells) {
        for (const digit of candidateMap[index]) {
          if (!tripleDigits.includes(digit)) updates.push({ index, eliminatedCandidate: digit })
        }
      }
      if (updates.length) {
        return eliminationHint(
          'Hidden Triple',
          updates,
          tripleCells,
          `${house.label}中的候选 ${tripleDigits.join('、')} 只出现在三个高亮格中，因此这三格可以排除除此以外的候选。`,
        )
      }
    }
  }
  return null
}

export function findFish(board, candidateMap, size) {
  const strategy = size === 2 ? 'X-Wing' : size === 3 ? 'Swordfish' : 'Jellyfish'
  const orientations = [
    { baseType: 'row', baseName: '行', coverName: '列' },
    { baseType: 'column', baseName: '列', coverName: '行' },
  ]
  for (const orientation of orientations) {
    const baseHouses = HOUSES.filter((house) => house.type === orientation.baseType)
    for (const digit of DIGITS) {
      const eligible = baseHouses.map((house, baseIndex) => {
        const sourceCells = house.cells.filter((index) => !board[index] && candidateMap[index].includes(digit))
        const covers = sourceCells.map((index) => orientation.baseType === 'row' ? index % 9 : Math.floor(index / 9))
        return { baseIndex, sourceCells, covers }
      }).filter((entry) => entry.covers.length >= 2 && entry.covers.length <= size)

      for (const selected of combinations(eligible, size)) {
        const coverIndexes = [...new Set(selected.flatMap((entry) => entry.covers))].sort((a, b) => a - b)
        if (coverIndexes.length !== size) continue
        const baseIndexes = new Set(selected.map((entry) => entry.baseIndex))
        const updates = []
        for (const coverIndex of coverIndexes) {
          for (let baseIndex = 0; baseIndex < 9; baseIndex += 1) {
            if (baseIndexes.has(baseIndex)) continue
            const index = orientation.baseType === 'row' ? baseIndex * 9 + coverIndex : coverIndex * 9 + baseIndex
            if (!board[index] && candidateMap[index].includes(digit)) updates.push({ index, eliminatedCandidate: digit })
          }
        }
        if (updates.length) {
          const sourceCells = selected.flatMap((entry) => entry.sourceCells)
          const baseLabels = selected.map((entry) => entry.baseIndex + 1).join('、')
          const coverLabels = coverIndexes.map((index) => index + 1).join('、')
          return eliminationHint(
            strategy,
            updates,
            [...sourceCells, ...updates.map((update) => update.index)],
            `候选 ${digit} 在第 ${baseLabels} ${orientation.baseName}中都被限制在第 ${coverLabels} ${orientation.coverName}，形成 ${strategy}，因此这些${orientation.coverName}的其他格可以排除 ${digit}。`,
          )
        }
      }
    }
  }
  return null
}

export function findSkyscraper(board, candidateMap) {
  const orientations = ['row', 'column']
  for (const orientation of orientations) {
    const houses = HOUSES.filter((house) => house.type === orientation)
    for (const digit of DIGITS) {
      const strongLinks = houses.map((house, houseIndex) => ({
        houseIndex,
        cells: house.cells.filter((index) => !board[index] && candidateMap[index].includes(digit)),
      })).filter((entry) => entry.cells.length === 2)
      for (const [first, second] of combinations(strongLinks, 2)) {
        const firstPositions = first.cells.map((index) => orientation === 'row' ? index % 9 : Math.floor(index / 9))
        const secondPositions = second.cells.map((index) => orientation === 'row' ? index % 9 : Math.floor(index / 9))
        const commonPositions = firstPositions.filter((position) => secondPositions.includes(position))
        if (commonPositions.length !== 1) continue
        const roofA = first.cells.find((index) => (orientation === 'row' ? index % 9 : Math.floor(index / 9)) !== commonPositions[0])
        const roofB = second.cells.find((index) => (orientation === 'row' ? index % 9 : Math.floor(index / 9)) !== commonPositions[0])
        if (arePeers(roofA, roofB)) continue
        const sourceCells = [...first.cells, ...second.cells]
        const updates = board.map((value, index) => ({ value, index }))
          .filter(({ value, index }) => !value && !sourceCells.includes(index) && arePeers(index, roofA) && arePeers(index, roofB) && candidateMap[index].includes(digit))
          .map(({ index }) => ({ index, eliminatedCandidate: digit }))
        if (updates.length) {
          return eliminationHint(
            'Skyscraper',
            updates,
            [...sourceCells, ...updates.map((update) => update.index)],
            `候选 ${digit} 在两条${orientation === 'row' ? '行' : '列'}中各形成强链，并共享同一端；两个楼顶至少有一个为真，因此同时看到两个楼顶的格可以排除 ${digit}。`,
          )
        }
      }
    }
  }
  return null
}

export function findTwoStringKite(board, candidateMap) {
  const rows = HOUSES.filter((house) => house.type === 'row')
  const columns = HOUSES.filter((house) => house.type === 'column')
  for (const digit of DIGITS) {
    const rowLinks = rows.map((house) => house.cells.filter((index) => !board[index] && candidateMap[index].includes(digit))).filter((cells) => cells.length === 2)
    const columnLinks = columns.map((house) => house.cells.filter((index) => !board[index] && candidateMap[index].includes(digit))).filter((cells) => cells.length === 2)
    for (const rowCells of rowLinks) {
      for (const columnCells of columnLinks) {
        for (const rowJoint of rowCells) {
          for (const columnJoint of columnCells) {
            if (rowJoint === columnJoint || Math.floor(Math.floor(rowJoint / 9) / 3) !== Math.floor(Math.floor(columnJoint / 9) / 3) || Math.floor((rowJoint % 9) / 3) !== Math.floor((columnJoint % 9) / 3)) continue
            const rowRoof = rowCells.find((index) => index !== rowJoint)
            const columnRoof = columnCells.find((index) => index !== columnJoint)
            const sourceCells = [...new Set([...rowCells, ...columnCells])]
            const updates = board.map((value, index) => ({ value, index }))
              .filter(({ value, index }) => !value && !sourceCells.includes(index) && arePeers(index, rowRoof) && arePeers(index, columnRoof) && candidateMap[index].includes(digit))
              .map(({ index }) => ({ index, eliminatedCandidate: digit }))
            if (updates.length) {
              return eliminationHint(
                'Two-String Kite',
                updates,
                [...sourceCells, ...updates.map((update) => update.index)],
                `候选 ${digit} 的一条行强链和一条列强链在同一宫相连，形成双线风筝；两个外端至少有一个为真，因此同时看到两个外端的格可以排除 ${digit}。`,
              )
            }
          }
        }
      }
    }
  }
  return null
}

export function findXYZWing(board, candidateMap) {
  const pivots = board.map((value, index) => (!value && candidateMap[index].length === 3 ? index : -1)).filter((index) => index >= 0)
  const bivalueCells = board.map((value, index) => (!value && candidateMap[index].length === 2 ? index : -1)).filter((index) => index >= 0)
  for (const pivot of pivots) {
    const pivotDigits = candidateMap[pivot]
    const wings = bivalueCells.filter((index) => arePeers(pivot, index) && candidateMap[index].every((digit) => pivotDigits.includes(digit)))
    for (const [firstWing, secondWing] of combinations(wings, 2)) {
      const sharedDigits = candidateMap[firstWing].filter((digit) => candidateMap[secondWing].includes(digit))
      if (sharedDigits.length !== 1 || new Set([...candidateMap[firstWing], ...candidateMap[secondWing]]).size !== 3) continue
      const sharedDigit = sharedDigits[0]
      const updates = board.map((value, index) => ({ value, index }))
        .filter(({ value, index }) => !value && index !== pivot && index !== firstWing && index !== secondWing && arePeers(index, pivot) && arePeers(index, firstWing) && arePeers(index, secondWing) && candidateMap[index].includes(sharedDigit))
        .map(({ index }) => ({ index, eliminatedCandidate: sharedDigit }))
      if (updates.length) {
        return eliminationHint(
          'XYZ-Wing',
          updates,
          [pivot, firstWing, secondWing, ...updates.map((update) => update.index)],
          `${cellName(pivot)} 是三候选枢轴格，两翼与枢轴共同构成 XYZ-Wing；三格中至少有一个必须为 ${sharedDigit}，因此同时看到三格的位置可以排除 ${sharedDigit}。`,
        )
      }
    }
  }
  return null
}

function cellDigits(board, candidateMap, index) {
  return board[index] ? [board[index]] : candidateMap[index]
}

export function findJuniorExocet(board, candidateMap) {
  const orientations = ['row', 'column']
  for (const orientation of orientations) {
    const indexAt = (line, position) => orientation === 'row' ? line * 9 + position : position * 9 + line
    const lineOf = (index) => orientation === 'row' ? Math.floor(index / 9) : index % 9
    const positionOf = (index) => orientation === 'row' ? index % 9 : Math.floor(index / 9)
    for (let group = 0; group < 3; group += 1) {
      for (let baseBox = 0; baseBox < 3; baseBox += 1) {
        for (let lineOffset = 0; lineOffset < 3; lineOffset += 1) {
          const baseLine = group * 3 + lineOffset
          const miniLine = [0, 1, 2].map((offset) => indexAt(baseLine, baseBox * 3 + offset))
          const emptyMiniLine = miniLine.filter((index) => !board[index])
          for (const baseCells of combinations(emptyMiniLine, 2)) {
            const baseDigits = [...new Set(baseCells.flatMap((index) => candidateMap[index]))].sort((a, b) => a - b)
            if (baseDigits.length < 3 || baseDigits.length > 4 || baseCells.some((index) => candidateMap[index].length < 2)) continue
            const crossBaseCell = miniLine.find((index) => !baseCells.includes(index))
            const targetBoxes = [0, 1, 2].filter((box) => box !== baseBox)
            const targetGroups = targetBoxes.map((box) => {
              const cells = []
              for (let targetLine = group * 3; targetLine < group * 3 + 3; targetLine += 1) {
                if (targetLine === baseLine) continue
                for (let offset = 0; offset < 3; offset += 1) {
                  const index = indexAt(targetLine, box * 3 + offset)
                  if (!board[index] && baseDigits.every((digit) => candidateMap[index].includes(digit))) cells.push(index)
                }
              }
              return cells
            })
            for (const firstTarget of targetGroups[0]) {
              for (const secondTarget of targetGroups[1]) {
                if (lineOf(firstTarget) === lineOf(secondTarget)) continue
                const firstCompanion = indexAt(lineOf(firstTarget), positionOf(secondTarget))
                const secondCompanion = indexAt(lineOf(secondTarget), positionOf(firstTarget))
                if ([firstCompanion, secondCompanion].some((index) => cellDigits(board, candidateMap, index).some((digit) => baseDigits.includes(digit)))) continue
                const crossPositions = [...new Set([positionOf(crossBaseCell), positionOf(firstTarget), positionOf(secondTarget)])]
                if (crossPositions.length !== 3) continue
                const sCells = []
                for (let line = 0; line < 9; line += 1) {
                  if (Math.floor(line / 3) === group) continue
                  for (const position of crossPositions) sCells.push(indexAt(line, position))
                }
                const coverLinesValid = baseDigits.every((digit) => {
                  const coverLines = new Set(sCells.filter((index) => cellDigits(board, candidateMap, index).includes(digit)).map(lineOf))
                  return coverLines.size >= 1 && coverLines.size <= 2
                })
                if (!coverLinesValid) continue
                const targets = [firstTarget, secondTarget]
                const updates = targets.flatMap((index) => candidateMap[index]
                  .filter((digit) => !baseDigits.includes(digit))
                  .map((digit) => ({ index, eliminatedCandidate: digit })))
                if (updates.length) {
                  const removalText = updates.map((update) => `${cellName(update.index)} 排除 ${update.eliminatedCandidate}`).join('，')
                  return eliminationHint(
                    'Junior Exocet',
                    updates,
                    [...baseCells, ...targets],
                    `两个基格的候选 ${baseDigits.join('、')} 通过三条交叉线满足覆盖条件，形成 Junior Exocet；两个目标格只能填写不同的基数，因此${removalText}。`,
                  )
                }
              }
            }
          }
        }
      }
    }
  }
  return null
}

export function findYWing(board, candidateMap) {
  const bivalueCells = board.map((value, index) => (!value && candidateMap[index].length === 2 ? index : -1)).filter((index) => index >= 0)
  for (const pivot of bivalueCells) {
    const [firstPivotDigit, secondPivotDigit] = candidateMap[pivot]
    for (const [firstDigit, secondDigit] of [[firstPivotDigit, secondPivotDigit], [secondPivotDigit, firstPivotDigit]]) {
      const firstWings = bivalueCells.filter((index) => index !== pivot && arePeers(pivot, index) && candidateMap[index].includes(firstDigit) && !candidateMap[index].includes(secondDigit))
      for (const firstWing of firstWings) {
        const sharedDigit = candidateMap[firstWing].find((digit) => digit !== firstDigit)
        const secondWings = bivalueCells.filter((index) => index !== pivot && index !== firstWing && arePeers(pivot, index) && candidateMap[index].includes(secondDigit) && candidateMap[index].includes(sharedDigit))
        for (const secondWing of secondWings) {
          const updates = board.map((value, index) => ({ value, index }))
            .filter(({ value, index }) => !value && index !== pivot && index !== firstWing && index !== secondWing && arePeers(index, firstWing) && arePeers(index, secondWing) && candidateMap[index].includes(sharedDigit))
            .map(({ index }) => ({ index, eliminatedCandidate: sharedDigit }))
          if (updates.length) {
            return eliminationHint(
              'Y-Wing',
              updates,
              [pivot, firstWing, secondWing, ...updates.map((update) => update.index)],
              `${cellName(pivot)} 是枢轴格，两翼 ${cellName(firstWing)} 与 ${cellName(secondWing)} 构成 Y-Wing；无论枢轴取哪个候选，两翼中必有一格为 ${sharedDigit}，因此两翼共同影响的格可以排除 ${sharedDigit}。`,
            )
          }
        }
      }
    }
  }
  return null
}

export function getLogicalHint(board, workingCandidates = null) {
  const legalCandidates = board.map((_, index) => candidateList(board, index))
  const candidateMap = workingCandidates
    ? legalCandidates.map((legal, index) => {
        if (board[index]) return []
        const filtered = (workingCandidates[index] || []).filter((digit) => legal.includes(digit))
        return filtered.length ? filtered : legal
      })
    : legalCandidates
  return findOpenSingle(board, candidateMap)
    || findNakedSingle(board, candidateMap)
    || findHiddenSingle(board, candidateMap)
    || findNakedPair(board, candidateMap)
    || findHiddenPair(board, candidateMap)
    || findLockedCandidate(board, candidateMap)
    || findClaimingCandidate(board, candidateMap)
    || findNakedTriple(board, candidateMap)
    || findHiddenTriple(board, candidateMap)
    || findFish(board, candidateMap, 2)
    || findSkyscraper(board, candidateMap)
    || findTwoStringKite(board, candidateMap)
    || findYWing(board, candidateMap)
    || findXYZWing(board, candidateMap)
    || findFish(board, candidateMap, 3)
    || findFish(board, candidateMap, 4)
    || findJuniorExocet(board, candidateMap)
    || null
}
