import { ServerError } from '../server'
import { Thread } from '../thread'
import { JobServer } from './job'
import { JobData } from './jobData'
import { JobMessageIn, JobMessageInType, JobMessageOut, JobMessageOutType } from './jobMessage'
import { JobRegistry } from './jobRegistry'

export class JobThread<D extends JobData> extends Thread<JobMessageIn, JobMessageOut, D> {
  private readonly job: JobServer<any, any, any>

  constructor() {
    super()

    const Constructor = JobRegistry.getInstance().get(this.data.type)
    if (!Constructor) throw new ServerError('jobNotRegistered', this.data)

    this.job = new Constructor(this.data)
    this.job.on(JobMessageOutType.summaryUpdate, this.postSummary.bind(this))
    this.job.start().then(() => this.logger.debug(`job started`))
  }

  async onMessage(msg: JobMessageIn): Promise<void> {
    switch (msg.type) {
      case JobMessageInType.getSummary:
        this.postSummary()
        break
      case JobMessageInType.cancel:
        await this.job.cancel()
        break
      default:
        this.logger.debug(`Skipping unknown message type: ${msg.type}`)
    }
  }

  private postSummary(): void {
    this.postMessage({ type: JobMessageOutType.summaryUpdate, summary: this.job.summary })
  }
}

new JobThread()
