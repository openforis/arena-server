import { Express } from 'express'

import { ArenaAppInfo } from '@openforis/arena-core'

import { ArenaServerConstants } from '../../model'
import { ProcessEnv } from '../../processEnv'
import { ExpressInitializer } from '../../server'
import { ApiEndpoint } from '../endpoint'

export const InfoRead: ExpressInitializer = {
  init: (express: Express): void => {
    express.get(ApiEndpoint.info.info(), (_req, res, _next) => {
      const appInfo: ArenaAppInfo = {
        appId: ArenaServerConstants.appId,
        version: ProcessEnv.applicationVersion,
      }
      const config = {
        activityLogDisabled: ProcessEnv.activityLogDisabled,
        aiFeaturesEnabled: ProcessEnv.aiFeaturesEnabled,
        experimentalFeatures: ProcessEnv.experimentalFeatures,
        fileUploadLimit: ProcessEnv.fileUploadLimit,
      }
      res.json({ appInfo, config })
    })
  },
}
