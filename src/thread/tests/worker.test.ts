import * as path from 'path'
import { Worker } from '../worker'
import { AdditionMessageIn, AdditionMessageOut, AdditionMessageType } from './workerAddition'

const awaitWorkerMessage = (worker: Worker): Promise<any> =>
  new Promise<any>((resolve, reject) => {
    worker.on('message', resolve)
    worker.on('error', reject)
  })

describe('Worker', () => {
  test('WorkerAdd', async () => {
    const worker = new Worker(path.resolve(__dirname, 'workerAddition.js'))
    const message: AdditionMessageIn = { x: 1, y: 2, type: AdditionMessageType.add }
    worker.postMessage(message)
    const { result }: AdditionMessageOut = await awaitWorkerMessage(worker)
    await worker.terminate()

    expect(result).toBe(3)
  })
})
