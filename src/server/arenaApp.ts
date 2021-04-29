import { Express, RequestHandler } from 'express'
import { User as ArenaUser } from '@openforis/arena-core'

/**
 * Express app wrapper.
 */
export interface ArenaApp {
  express: Express
  session: RequestHandler
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // Express.User is defined as {}
    // We extend it globally to be arena-core/User
    // @ts-ignore
    type User = ArenaUser
    export interface Request {
      // @ts-ignore
      user: ArenaUser
    }
  }
}
