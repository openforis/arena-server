import { EventEmitter } from 'node:events'
import { DebouncedFunc, throttle } from 'lodash'
import { Job, JobStatus, JobSummary, UUIDs } from '@openforis/arena-core'

import { BaseProtocol, DB } from '../db'
import { Logger } from '../log'
import { ServerError } from '../server'
import { JobData } from './jobData'
import { JobContext } from './jobContext'
import { JobEventType } from './jobEventType'

export interface JobConstructor {
  new (): JobServer<any, any, any>
  new <P extends JobData, R, C extends JobContext>(): JobServer<P, R, C>
  readonly prototype: JobServer<any, any, any>
}

export abstract class JobServer<P extends JobData, R, C extends JobContext> extends EventEmitter implements Job<R> {
  summary: JobSummary<R>
  protected readonly logger = new Logger(`Job ${this.constructor.name}`)
  protected context: C
  protected workerData: P
  protected jobs: Array<JobServer<any, any, C>>
  private notifyThrottle: DebouncedFunc<() => void> | undefined = undefined
  private jobCurrent: JobServer<any, any, C> | undefined = undefined

  protected constructor(data: P, jobs: Array<JobServer<any, any, C>> = []) {
    super()
    this.workerData = data
    this.jobs = jobs
    this.context = { surveyId: data.surveyId, user: data.user } as C

    this.summary = {
      errors: undefined,
      jobs: this.jobs.map((job) => job.summary),
      processed: 0,
      result: undefined,
      status: JobStatus.pending,
      surveyId: this.context.surveyId,
      total: 1,
      type: this.workerData.type,
      userUuid: this.context.user.uuid,
      uuid: UUIDs.v4(),
      startTime: undefined,
      endTime: undefined,
    }

    this.jobs.forEach((job) => job.on(JobEventType.jobUpdate, this.onJobUpdate.bind(this)))
  }

  async start(client: BaseProtocol<any> = DB): Promise<void> {
    this.logger.debug('start')

    // 1. crates a db transaction and run '_executeInTransaction' into it
    try {
      await client.tx((tx) => this.executeInTransaction(tx))

      // 2. notify job status change to 'succeed' (when transaction has been committed)
      if (this.summary.status === JobStatus.running) {
        await this.setStatus(JobStatus.succeeded)
      }
    } catch (error) {
      if (this.summary.status === JobStatus.running) {
        // Error found, change status only if not changed already
        this.logger.error(`${error.stack || error}`)
        this.addError({
          error: {
            valid: false,
            errors: [{ key: 'appErrors.generic', params: { text: error.toString() } }],
          },
        })
        await this.setStatus(JobStatus.failed)
      }
    }
  }

  async cancel(): Promise<void> {
    if (this.jobCurrent) {
      if (this.jobCurrent.summary.status === JobStatus.running) {
        await this.jobCurrent.cancel()
        // Parent job will be canceled by the inner job event listener
      }
    } else {
      await this.beforeEnd()
      await this.setStatus(JobStatus.canceled)
    }
  }

  private async executeInTransaction(tx: BaseProtocol<any>): Promise<void> {
    try {
      this.context.tx = tx

      // 1. notify start
      await this.onStart()

      const shouldExecute = await this.shouldExecute()
      this.logger.debug('Should execute?', shouldExecute)

      if (shouldExecute) {
        // 2. execute
        if (this.jobs.length > 0) {
          await this.executeJobs()
        } else {
          await this.execute()
        }

        // 3. execution completed, prepare result
        if (this.summary.status === JobStatus.running) {
          this.logger.debug('beforeSuccess...')
          await this.beforeSuccess()
          this.logger.debug('beforeSuccess run')
        }
      }
      // DO NOT CATCH EXCEPTIONS! Transaction will be aborted in that case
    } finally {
      if (this.summary.status !== JobStatus.canceled) {
        // 4. flush/clean resources
        this.logger.debug('beforeEnd...')
        await this.beforeEnd()
        this.logger.debug('beforeEnd run')
      }

      this.context.tx = undefined
    }

    // 5. if errors found or job has been canceled, throw an error to rollback transaction
    if (this.summary.status !== JobStatus.running) {
      throw new ServerError('jobCanceledOrErrorsFound')
    }
  }

  private async executeJobs(): Promise<void> {
    this.summary.total = this.jobs.length
    this.logger.debug(`- ${this.summary.total} inner jobs found`)

    // Start each inner job and wait for it's completion before starting next one
    for (let i = 0; i < this.jobs.length; i++) {
      this.logger.debug(`- executing inner job ${i + 1}`)
      this.jobCurrent = this.jobs[i]
      this.jobCurrent.context = this.context

      await this.jobCurrent.start(this.context.tx)

      if (this.jobCurrent.summary.status === JobStatus.succeeded) {
        this.incrementProcessedItems()
      } else {
        break
      }
    }

    this.logger.debug(`- ${this.summary.processed} inner jobs processed successfully`)
  }

  protected abstract execute(): Promise<void>

  protected async shouldExecute(): Promise<boolean> {
    return true
  }

  protected emitJobUpdateEvent(): void {
    this.emit(JobEventType.jobUpdate, this.summary)
  }

  protected incrementProcessedItems(incrementBy = 1): void {
    this.summary.processed += incrementBy
  }

  protected async setStatus(status: JobStatus): Promise<void> {
    this.logger.debug(`set status: ${status}`)
    this.summary.status = status

    if ([JobStatus.succeeded, JobStatus.failed, JobStatus.canceled].includes(status)) {
      this.logger.debug('onEnd...')
      await this.onEnd()
      this.logger.debug('onEnd run')
    }

    await this.emitJobUpdateEvent()
  }

  private async onJobUpdate(summary: JobSummary<any>): Promise<void> {
    switch (summary.status) {
      case JobStatus.failed:
      case JobStatus.canceled:
        // Cancel or fail even parent job
        await this.setStatus(summary.status)
        break
      case JobStatus.running:
        // Propagate progress event to parent job
        await this.emitJobUpdateEvent()
        break
      default:
        this.logger.debug(`Unknown event status: ${summary.status}`)
    }
  }

  /**
   * Called when the job just has been started.
   */
  protected async onStart(): Promise<void> {
    this.notifyThrottle = throttle(() => this.emit(JobEventType.jobUpdate, this.summary), 1000)
    this.summary.startTime = new Date()
    await this.setStatus(JobStatus.running)
  }

  /**
   * Called before onEnd only if the status will change to 'success'.
   * It runs INSIDE the current db transaction.
   */
  protected beforeSuccess(): Promise<void> {
    this.logger.debug('Before success')
    return Promise.resolve()
  }

  /**
   * Called before onEnd. Useful for flushing resources used by the job before it terminates completely.
   * It runs INSIDE the current db transaction.
   */
  protected beforeEnd(): Promise<void> {
    this.logger.debug('Before end')
    return Promise.resolve()
  }

  /**
   * Called when the job status changes to success, failed or canceled
   * (it runs OUTSIDE of the current db transaction)
   */
  protected async onEnd(): Promise<void> {
    this.notifyThrottle?.cancel()
    this.summary.endTime = new Date()
  }

  protected addError(error: any, errorKey?: string): void {
    if (!this.summary.errors) this.summary.errors = {}
    const key = errorKey || String(this.summary.processed + 1)
    this.summary.errors[key] = error
  }
}
