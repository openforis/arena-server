import { Express } from 'express'

import { ExpressInitializer } from '../../server'
import { ApiEndpoint } from '../endpoint'

export const ChainRead: ExpressInitializer = {
  init: (express: Express): void => {
    express.get(ApiEndpoint.chain.chainsCount(':surveyId'), (_req, _res, _next) => {
      //TODO
      // try {
      // } catch (error) {
      //   next(error)
      // }
    })
  },
}
