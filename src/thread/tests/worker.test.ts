import * as path from 'path'
import { Worker } from '../worker'

const getWorkerResult = (worker: Worker): Promise<any> => {
  return new Promise<any>((resolve, reject) => {
    worker.on('message', resolve)
    worker.on('error', reject)
  })
}

describe('Worker', () => {
  test('WorkerAdd', async () => {
    const worker = new Worker(path.resolve(__dirname, 'workerAddition.js'))
    worker.postMessage({ x: 1, y: 2 })
    const result = await getWorkerResult(worker)

    await worker.terminate()
    expect(result).toBe(3)
  })
})
