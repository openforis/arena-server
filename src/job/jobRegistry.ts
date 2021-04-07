import { JobConstructor } from './job'

export class JobRegistry extends Map<string, JobConstructor> {
  private static instance: JobRegistry

  static getInstance(): JobRegistry {
    if (!JobRegistry.instance) {
      JobRegistry.instance = new Map<string, JobConstructor>()
    }
    return JobRegistry.instance
  }
}
