import { Express } from 'express'

import { ExpressInitializer } from '../../server'
import { ApiEndpoint } from '../endpoint'

export const ChainRead: ExpressInitializer = {
  init: (express: Express): void => {
    express.get(ApiEndpoint.chain.chainsCount(':surveyId'), (_req, _res, next) => {
      try {
        //TODO
      } catch (error) {
        next(error)
      }
    })
  },
}
