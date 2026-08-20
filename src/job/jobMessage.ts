import { JobSerialized } from '@openforis/arena-core'

import { WorkerMessage } from '../thread'

export enum JobMessageInType {
  getStatus = 'getStatus',
  cancel = 'cancel',
}

export enum JobMessageOutType {
  jobUpdate = 'jobUpdate',
}

export type JobMessageIn = WorkerMessage<JobMessageInType>

export interface JobMessageOut extends WorkerMessage<JobMessageOutType> {
  job: JobSerialized<any>
}
