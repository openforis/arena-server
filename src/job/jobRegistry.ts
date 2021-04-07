import { JobConstructor } from './job'
import { NodeEnv, ProcessEnv } from '../processEnv'

export class JobRegistry extends Map<string, JobConstructor> {
  private static instance: JobRegistry

  static async getInstance(): Promise<JobRegistry> {
    if (!JobRegistry.instance) {
      JobRegistry.instance = new Map<string, JobConstructor>()

      if (ProcessEnv.nodeEnv === NodeEnv.test) {
        const { SimpleJob } = await import('./tests/simpleJob')
        JobRegistry.instance.set(SimpleJob.TYPE, SimpleJob)
      }
    }

    return JobRegistry.instance
  }
}
