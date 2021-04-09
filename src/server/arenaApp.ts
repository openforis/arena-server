import { Express, RequestHandler } from 'express'

/**
 * Express app wrapper.
 */
export interface ArenaApp {
  app: Express
  session: RequestHandler
}
