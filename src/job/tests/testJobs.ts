import { JobServer } from '../job'
import { JobData } from '../jobData'
import { JobContext } from '../jobContext'

interface SimpleJobData extends JobData {
  result?: number
}

export class SimpleJob extends JobServer<SimpleJobData, number, JobContext> {
  static readonly type: string = 'simple'

  protected async execute(): Promise<void> {
    this.summary.total = 1

    // simulate async job
    await new Promise((resolve) => setTimeout(resolve, 500))
    this.incrementProcessedItems()

    return Promise.resolve()
  }

  protected async beforeSuccess(): Promise<void> {
    await super.beforeSuccess()
    this.summary.result = this.workerData.result || 3
  }
}

export class SimpleJobsWithJobs extends SimpleJob {
  static readonly type: string = 'simpleWithJobs'

  constructor(data: SimpleJobData) {
    super(data, [new SimpleJob({ ...data, result: 4 }), new SimpleJob({ ...data, result: 2 })])
  }

  protected async beforeSuccess(): Promise<void> {
    await super.beforeSuccess()
    this.summary.result = this.jobs.reduce<number>((total, job) => total + job.summary.result, 0)
  }
}
