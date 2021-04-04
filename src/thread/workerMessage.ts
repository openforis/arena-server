export enum WorkerMessageType {
  error = 'error',
}

export interface WorkerMessage<T> {
  type: T
}

export interface WorkerErrorMessage extends WorkerMessage<WorkerMessageType.error> {
  error: any
}
