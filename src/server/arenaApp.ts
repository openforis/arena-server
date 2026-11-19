import { Express } from 'express'
import { ArenaUser, ServiceRegistry } from '@openforis/arena-core'

/**
 * Express app wrapper.
 */
export interface ArenaApp {
  express: Express
  serviceRegistry: ServiceRegistry
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // Express.User is defined as {}
    // We extend it globally to be the arena-core ArenaUser
    // @ts-ignore
    type User = ArenaUser
    export interface Request {
      // @ts-ignore
      user: ArenaUser
      /***
       * Authorized download file name attached by download token middleware
       */
      downloadFileName?: string
    }
  }
}
