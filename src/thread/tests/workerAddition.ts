import { Thread } from '../thread'
import { WorkerMessage, WorkerMessageType } from '../workerMessage'

export enum AdditionMessageType {
  add = 'add',
  result = 'result',
}

export interface AdditionMessageIn extends WorkerMessage<WorkerMessageType | AdditionMessageType.add> {
  x: number
  y: number
}

export interface AdditionMessageOut extends WorkerMessage<WorkerMessageType | AdditionMessageType.result> {
  result: number
}

class ThreadAddition extends Thread<AdditionMessageIn, AdditionMessageOut> {
  protected onMessage(msg: AdditionMessageIn): Promise<any> {
    this.postMessage({ type: AdditionMessageType.result, result: msg.x + msg.y })
    return Promise.resolve(undefined)
  }
}

new ThreadAddition()
