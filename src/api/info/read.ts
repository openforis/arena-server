import { Express } from 'express'

import { AppInfo } from '@openforis/arena-core'

import { ArenaServerConstants } from '../../model'
import { ProcessEnv } from '../../processEnv'
import { ExpressInitializer } from '../../server'
import { ApiEndpoint } from '../endpoint'

export const InfoRead: ExpressInitializer = {
  init: (express: Express): void => {
    express.get(ApiEndpoint.info.info(), (_req, res, _next) => {
      const appInfo: AppInfo = {
        appId: ArenaServerConstants.appId,
        version: ProcessEnv.applicationVersion,
      }
      const config = {
        experimentalFeatures: ProcessEnv.experimentalFeatures,
        fileUploadLimit: ProcessEnv.fileUploadLimit,
      }
      res.json({ appInfo, config })
    })
  },
}
