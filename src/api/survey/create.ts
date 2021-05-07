import { Express } from 'express'

import { ExpressInitializer } from '../../server'
import { ApiEndpoint } from '../endpoint'
import { ApiAuthMiddleware } from '../middleware'

export const SurveyCreate: ExpressInitializer = {
  init: (express: Express): void => {
    express.post(ApiEndpoint.survey.create(), ApiAuthMiddleware.requireAdminPermission, async (_req, _res, _next) => {
      //TODO
      // try {
      // } catch (error) {
      //   next(error)
      // }
    })
  },
}
