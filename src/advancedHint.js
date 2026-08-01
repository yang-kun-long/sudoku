let worker
let requestId = 0
const pending = new Map()

function getWorker() {
  if (worker) return worker
  worker = new Worker(new URL('./hodoku.worker.js', import.meta.url), { type: 'module' })
  worker.onmessage = ({ data }) => {
    const request = pending.get(data.id)
    if (!request) return
    clearTimeout(request.timer)
    pending.delete(data.id)
    if (data.error) request.reject(new Error(data.error))
    else request.resolve(data.result)
  }
  worker.onerror = (event) => {
    for (const request of pending.values()) {
      clearTimeout(request.timer)
      request.reject(new Error(event.message || '高级提示引擎加载失败'))
    }
    pending.clear()
    worker?.terminate()
    worker = null
  }
  return worker
}

function serializePuzzle(board, candidateMap) {
  return board.map((value, index) => {
    if (value) return String(value)
    const candidates = candidateMap?.[index]
    return candidates?.length ? `{${candidates.join('')}}` : '.'
  }).join('')
}

export function getAdvancedHint(board, candidateMap) {
  const id = ++requestId
  const puzzle = serializePuzzle(board, candidateMap)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error('高级提示分析超时'))
    }, 60000)
    pending.set(id, { resolve, reject, timer })
    getWorker().postMessage({ id, puzzle })
  })
}

export function getAdvancedTechniqueCatalog() {
  const id = ++requestId
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error('策略目录加载超时'))
    }, 10000)
    pending.set(id, { resolve, reject, timer })
    getWorker().postMessage({ id, type: 'catalog' })
  })
}
