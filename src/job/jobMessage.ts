import { JobSummary } from '@openforis/arena-core'

import { WorkerMessage } from '../thread'

export enum JobMessageInType {
  getSummary = 'getSummary',
  cancel = 'cancel',
}

export enum JobMessageOutType {
  summaryUpdate = 'summaryUpdate',
}

export type JobMessageIn = WorkerMessage<JobMessageInType>

export interface JobMessageOut extends WorkerMessage<JobMessageOutType> {
  summary: JobSummary<any>
}
