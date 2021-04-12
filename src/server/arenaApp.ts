import { Express, RequestHandler } from 'express'

/**
 * Express app wrapper.
 */
export interface ArenaApp {
  express: Express
  session: RequestHandler
}
