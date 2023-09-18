import { JobServer } from '../job'
import { JobContext } from '../jobContext'

interface SimpleJobContext extends JobContext {
  result?: number
}

export class SimpleJob extends JobServer<SimpleJobContext, number> {
  static readonly type: string = 'simple'

  protected async execute(): Promise<void> {
    this.summary.total = 1

    // simulate async job
    await new Promise((resolve) => setTimeout(resolve, 500))
    this.incrementProcessedItems()

    return Promise.resolve()
  }

  protected async prepareResult(): Promise<number> {
    await super.prepareResult()
    return this.context.result ?? 3
  }
}

export class SimpleJobWithJobs extends SimpleJob {
  static readonly type: string = 'simpleWithJobs'

  constructor(data: SimpleJobContext) {
    super(data, [new SimpleJob({ ...data, result: 4 }), new SimpleJob({ ...data, result: 2 })])
  }

  protected async prepareResult(): Promise<number> {
    await super.prepareResult()
    return this.jobs.reduce<number>((total, job) => total + job.summary.result, 0)
  }
}
