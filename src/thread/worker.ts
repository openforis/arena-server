// import * as path from 'path'
import { Worker as WorkerWorkerThreads } from 'worker_threads'

import { Logger } from '../log'

export class Worker extends WorkerWorkerThreads {
  private readonly logger: Logger

  constructor(filename: string, workerData: any = {}) {
    // super(path.resolve(__dirname, '_worker.js'), { workerData: { filename, ...workerData } })
    super(filename, { workerData })
    this.logger = new Logger(`ThreadManager - thread ID: ${this.threadId}`)
  }

  on(event: string | symbol, listener: (...args: Array<any>) => void): this {
    if (event === 'ext') this.logger.debug('thread exit')

    //TODO:
    // if (event === 'message') {
    //   if (msg.type === Thread.messageTypes.error) {
    //     if (this.socketId) {
    //       WebSocket.notifySocket(this.socketId, WebSocketEvents.error, msg.error)
    //     } else {
    //       WebSocket.notifyUser(User.getUuid(user), WebSocketEvents.error, msg.error)
    //     }
    //   } else {
    //     messageHandler(msg)
    //   }
    // }

    return super.on(event, listener)
  }
}
