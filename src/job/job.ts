import { AbstractJob } from '@openforis/arena-core'

import { Logger } from '../log'
import { ServerError } from '../server'
import { JobContextServer } from './jobContext'

export interface JobConstructor {
  new (context: any, jobs?: JobServer<any, any>[]): JobServer<any, any>
  new <C extends JobContextServer, R>(context: C, jobs?: JobServer<C, any>[]): JobServer<C, R>
  readonly prototype: JobServer<any, any>
}

export abstract class JobServer<C extends JobContextServer, R = undefined> extends AbstractJob<C, R> {
  public constructor(context: C, jobs: JobServer<C, any>[] = []) {
    super(context, jobs)
    this.logger = new Logger(`Job ${this.constructor.name}`)
  }

  protected throwError(errorKey: string): void {
    throw new ServerError(errorKey)
  }
}
