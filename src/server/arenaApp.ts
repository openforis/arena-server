import { Express, RequestHandler, Request as _Request } from 'express'
import { User as _User } from '@openforis/arena-core'
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
    type User = _User
    export interface Request {
      user?: _User
    }
  }
}
