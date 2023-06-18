import { JobMessageInType, JobMessageOutType, JobSummary } from '@openforis/arena-core'

import { WorkerMessage } from '../thread'

export type JobMessageIn = WorkerMessage<JobMessageInType>

export interface JobMessageOut extends WorkerMessage<JobMessageOutType> {
  summary: JobSummary<any>
}
