import { ServerError } from '../server'
import { Thread } from '../thread'
import { JobServer } from './job'
import { JobData } from './jobData'
import { JobMessageIn, JobMessageInType, JobMessageOut, JobMessageOutType } from './jobMessage'
import { JobRegistry } from './jobRegistry'

export class JobThread<D extends JobData> extends Thread<JobMessageIn, JobMessageOut, D> {
  private job: JobServer<any, any, any> | undefined

  constructor() {
    super()

    JobRegistry.getInstance().then((jobRegistry: JobRegistry) => {
      const Job = jobRegistry.get(this.data.type)
      if (!Job) throw new ServerError('jobNotRegistered', this.data)

      this.job = new Job(this.data)
      this.job.on(JobMessageOutType.summaryUpdate, this.postSummary.bind(this))
      this.job.start()
    })
  }

  async onMessage(msg: JobMessageIn): Promise<void> {
    switch (msg.type) {
      case JobMessageInType.getSummary:
        this.postSummary()
        break
      case JobMessageInType.cancel:
        this.job && (await this.job.cancel())
        break
      default:
        this.logger.debug(`Skipping unknown message type: ${msg.type}`)
    }
  }

  private postSummary(): void {
    this.job && this.postMessage({ type: JobMessageOutType.summaryUpdate, summary: this.job.summary })
  }
}

new JobThread()
