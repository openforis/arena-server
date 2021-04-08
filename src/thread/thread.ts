import { parentPort, workerData, isMainThread } from 'worker_threads'

import { Logger } from '../log'
import { WorkerErrorMessage, WorkerMessage, WorkerMessageType } from './workerMessage'

export abstract class Thread<MessageIn extends WorkerMessage<any>, MessageOut extends WorkerMessage<any>, D = null> {
  protected readonly logger: Logger
  readonly data: D

  constructor() {
    this.logger = new Logger(this.constructor.name)
    this.data = workerData

    if (!isMainThread && parentPort) {
      parentPort.on('message', this.messageHandler.bind(this))
    }
  }

  /**
   * Send message to main event loop
   * @param msg
   */
  protected postMessage(msg: MessageOut | WorkerErrorMessage): void {
    if (parentPort) {
      parentPort.postMessage(msg)
      //TODO: in Arena we passed user and surveyId. can't we get in worker directly instead?
      // parentPort.postMessage({ user: this.params.user, surveyId: this.params.surveyId, msg })
    }
  }

  protected async messageHandler(msg: MessageIn): Promise<void> {
    try {
      await this.onMessage(msg)
    } catch (error) {
      const errorMessage = error.toString()
      this.logger.error(`Error in thread:  ${errorMessage}`)
      this.logger.error(error.stack)
      this.postMessage({ error, type: WorkerMessageType.error })
    }
  }

  /**
   * Receive message from main event loop
   * @param msg
   */
  protected abstract onMessage(msg: MessageIn): Promise<any>
}
