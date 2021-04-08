import { EventEmitter } from 'events'
import { DebouncedFunc, throttle } from 'lodash'
import { Job, JobStatus, JobSummary, UUIDs } from '@openforis/arena-core'

import { BaseProtocol, DB } from '../db'
import { Logger } from '../log'
import { ServerError } from '../server'
import { JobContext } from './jobContext'
import { JobData } from './jobData'
import { JobMessageOutType } from './jobMessage'

export interface JobConstructor {
  new (data: any, jobs?: Array<JobServer<any, any, any>>): JobServer<any, any, any>
  new <P extends JobData, R, C extends JobContext>(data: P, jobs?: Array<JobServer<P, R, C>>): JobServer<P, R, C>
  readonly prototype: JobServer<any, any, any>
}

export abstract class JobServer<P extends JobData, R, C extends JobContext> extends EventEmitter implements Job<R> {
  summary: JobSummary<R>
  protected readonly logger = new Logger(`Job ${this.constructor.name}`)
  protected context: C
  protected workerData: P
  protected jobs: Array<JobServer<any, any, C>>
  private readonly emitSummaryUpdateEvent: DebouncedFunc<() => void>
  private jobCurrent: JobServer<any, any, C> | undefined = undefined

  public constructor(data: P, jobs: Array<JobServer<any, any, C>> = []) {
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

    this.emitSummaryUpdateEvent = throttle(() => this.emit(JobMessageOutType.summaryUpdate, this.summary), 500)
    this.jobs.forEach((job) => job.on(JobMessageOutType.summaryUpdate, this.onInnerJobSummaryUpdate.bind(this)))
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

  protected incrementProcessedItems(incrementBy = 1): void {
    this.summary.processed += incrementBy
    this.emitSummaryUpdateEvent()
  }

  protected async setStatus(status: JobStatus): Promise<void> {
    this.logger.debug(`set status: ${status}`)
    this.summary.status = status

    if ([JobStatus.succeeded, JobStatus.failed, JobStatus.canceled].includes(status)) {
      this.logger.debug('onEnd...')
      await this.onEnd()
      this.logger.debug('onEnd run')
    }

    this.emitSummaryUpdateEvent()
  }

  /**
   * Inner job summary update handler.
   */
  protected async onInnerJobSummaryUpdate(summary: JobSummary<any>): Promise<void> {
    const { status } = summary
    if ([JobStatus.canceled, JobStatus.failed].includes(status)) {
      await this.setStatus(status)
      return
    }
    if (status === JobStatus.running) {
      this.emitSummaryUpdateEvent()
      return
    }
    this.logger.debug(`Unknown inner job status: ${status}`)
  }

  /**
   * Called when the job just has been started.
   */
  protected async onStart(): Promise<void> {
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
    this.summary.endTime = new Date()
    this.emitSummaryUpdateEvent.flush()
    this.emitSummaryUpdateEvent.cancel()
  }

  protected addError(error: any, errorKey?: string): void {
    if (!this.summary.errors) this.summary.errors = {}
    const key = errorKey || String(this.summary.processed + 1)
    this.summary.errors[key] = error
  }
}
