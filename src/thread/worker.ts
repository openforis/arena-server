import { Worker as _Worker } from 'worker_threads'

import { Logger } from '../log'

export class Worker<D = null> extends _Worker {
  private readonly logger: Logger

  constructor(filename: string, workerData?: D) {
    super(filename, { workerData })
    this.logger = new Logger(`Worker - thread ID: ${this.threadId}`)
  }

  on(event: string | symbol, listener: (...args: Array<any>) => void): this {
    if (event === 'exit') this.logger.debug('thread exit')

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
