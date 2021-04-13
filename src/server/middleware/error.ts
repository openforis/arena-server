import { ErrorRequestHandler, Express, NextFunction, Request, Response } from 'express'

import { Logger } from '../../log'
import { Responses } from '../../utils'
import { ExpressInitializer } from '../expressInitializer'

const logger: Logger = new Logger('Error Middleware')

export const ErrorMiddleware: ExpressInitializer = {
  init(express: Express): void {
    const errorRequestHandler: ErrorRequestHandler = (
      error: Error,
      _request: Request,
      response: Response,
      _next: NextFunction
    ) => {
      logger.error(error.stack)
      Responses.sendError(response, error)
    }
    express.use(errorRequestHandler)
  },
}
