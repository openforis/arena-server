import { JobBase } from '@openforis/arena-core'

import { Logger } from '../log'
import { JobContext } from './jobContext'

export interface JobConstructor {
  new (context: any, jobs?: Array<JobServer<any, any>>): JobServer<any, any>
  new <C extends JobContext, R>(context: C, jobs?: Array<JobServer<C, any>>): JobServer<C, R>
  readonly prototype: JobServer<any, any>
}

export abstract class JobServer<C extends JobContext = JobContext, R = undefined> extends JobBase<C, R> {
  protected createLogger(): Logger {
    return new Logger(`Job ${this.constructor.name}`)
  }
}
