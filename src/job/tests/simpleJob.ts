import { JobServer } from '../job'
import { JobData } from '../jobData'
import { JobContext } from '../jobContext'

export class SimpleJob extends JobServer<JobData, number, JobContext> {
  static readonly TYPE: string = 'simple'

  protected async execute(): Promise<void> {
    this.summary.total = 1

    // simulate async job
    await new Promise((resolve) => setTimeout(resolve, 500))

    this.summary.result = 3
    this.incrementProcessedItems()
    return Promise.resolve()
  }
}
