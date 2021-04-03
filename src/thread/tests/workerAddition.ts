import { parentPort } from 'worker_threads'

const add = (x: number, y: number): number => x + y

// @ts-ignore
parentPort.on('message', ({ x, y }) => {
  // @ts-ignore
  parentPort.postMessage(add(x, y))
})
