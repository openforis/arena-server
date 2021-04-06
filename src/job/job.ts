// import { EventEmitter } from 'node:events'
// import throttle from 'lodash.throttle'
// import { DebouncedFunc } from 'lodash'
import { Job, JobStatus, JobSummary, UUIDs } from '@openforis/arena-core'

import { Logger } from '../log'
import { JobData } from './jobData'
import { JobContext } from './jobContext'
// import { JobEventType } from './jobEventType'
// import { BaseProtocol, DB } from '../db'

export interface JobConstructor {
  new (): JobServer<any, any, any>
  new <P extends JobData, R, C extends JobContext>(): JobServer<P, R, C>
  // readonly prototype: JobServer<any, any, any>
}

export abstract class JobServer<P extends JobData, R, C extends JobContext> {
  // extends EventEmitter
  // implements Job<P, R, C>
  protected readonly logger = new Logger(`Job ${this.constructor.name}`)
  //TODO: should context and params be removed from Job interface. Aren't these only implementation details of JobServer?
  context: C
  //TODO: rename params to workerData
  params: P
  summary: JobSummary<R>
  protected jobs: Array<Job<any, any, any>>
  // private notifyThrottle: DebouncedFunc<() => void> | undefined = undefined

  protected constructor(data: P, jobs: Array<Job<any, any, any>> = []) {
    super()
    this.params = data
    this.jobs = jobs
    this.context = { surveyId: data.surveyId, user: data.user } as C

    this.summary = {
      errors: {},
      jobs: this.jobs.map((job) => job.summary),
      processed: 0,
      result: undefined,
      status: JobStatus.pending,
      surveyId: this.context.surveyId,
      total: 1,
      type: this.params.type,
      userUuid: this.context.user.uuid,
      uuid: UUIDs.v4(),
      startTime: undefined,
      endTime: undefined,
    }
  }

  // async start(client: BaseProtocol<any> = DB): Promise<void> {
  //   this.logger.debug('start')
  //
  //   // 1. crates a db transaction and run '_executeInTransaction' into it
  //   try {
  //     await client.tx((tx) => this.executeInTransaction(tx))
  //
  //     // 2. notify job status change to 'succeed' (when transaction has been committed)
  //     if (this.summary.status === JobStatus.running) {
  //       await this.setStatusSucceeded()
  //     }
  //   } catch (error) {
  //     if (this.summary.status === JobStatus.running) {
  //       // Error found, change status only if not changed already
  //       this.logger.error(`${error.stack || error}`)
  //       this.addError({
  //         error: {
  //           valid: false,
  //           errors: [{ key: 'appErrors.generic', params: { text: error.toString() } }],
  //         },
  //       })
  //       await this.setStatusFailed()
  //     }
  //   }
  // }
  //
  // async cancel(): Promise<void> {}
  //
  // protected async shouldExecute(): Promise<boolean> {
  //   return true
  // }
  //
  // /**
  //  * Called when the job just has been started.
  //  */
  // protected async onStart(): Promise<void> {
  //   this.notifyThrottle = throttle(() => this.emit(JobEventType.jobUpdate, this.summary), 1000)
  //   this.summary.startTime = new Date()
  //   await this.setStatus(jobStatus.running)
  // }
  //
  // /**
  //  * Called before onEnd only if the status will change to 'success'.
  //  * It runs INSIDE the current db transaction.
  //  */
  // protected beforeSuccess(): Promise<void> {
  //   this.logger.debug('Before success')
  //   return Promise.resolve()
  // }
  //
  // /**
  //  * Called before onEnd. Useful for flushing resources used by the job before it terminates completely.
  //  * It runs INSIDE the current db transaction.
  //  */
  // protected beforeEnd(): Promise<void> {
  //   this.logger.debug('Before end')
  //   return Promise.resolve()
  // }
  //
  // /**
  //  * Called when the job status changes to success, failed or canceled
  //  * (it runs OUTSIDE of the current db transaction)
  //  */
  // protected async onEnd(): Promise<void> {
  //   this.notifyThrottle?.cancel()
  //   this.summary.endTime = new Date()
  // }
  //
  // addError(error, errorKey = null) {
  //   if (!errorKey) {
  //     errorKey = String(this.processed + 1)
  //   }
  //
  //   this.errors[errorKey] = error
  // }
}
