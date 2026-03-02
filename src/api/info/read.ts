import { Express } from 'express'

import { ProcessEnv } from '../../processEnv'
import { ExpressInitializer } from '../../server'
import { ApiEndpoint } from '../endpoint'

export const InfoRead: ExpressInitializer = {
  init: (express: Express): void => {
    express.get(ApiEndpoint.info.info(), (_req, res, _next) => {
      res.json({
        applicationVersion: ProcessEnv.applicationVersion,
        fileUploadLimit: ProcessEnv.fileUploadLimit,
      })
    })
  },
}
