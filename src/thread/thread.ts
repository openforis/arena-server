import { parentPort, workerData, isMainThread } from 'worker_threads'

import { Logger } from '../log'
import { WorkerErrorMessage, WorkerMessage, WorkerMessageType } from './workerMessage'

export abstract class Thread<MSG_IN extends WorkerMessage<any>, MSG_OUT extends WorkerMessage<any>, D = null> {
  private readonly logger: Logger
  readonly data: D

  constructor() {
    this.logger = new Logger('Thread')
    this.data = workerData

    if (!isMainThread && parentPort) {
      parentPort.on('message', this.messageHandler.bind(this))
    }
  }

  /**
   * Send message to main event loop
   * @param msg
   */
  protected postMessage(msg: MSG_OUT | WorkerErrorMessage): void {
    if (parentPort) {
      parentPort.postMessage(msg)
      //TODO: in Arena we passed user and surveyId. can't we get in worker directly instead?
      // parentPort.postMessage({ user: this.params.user, surveyId: this.params.surveyId, msg })
    }
  }

  protected async messageHandler(msg: MSG_IN): Promise<void> {
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
  protected abstract onMessage(msg: MSG_IN): Promise<any>
}
