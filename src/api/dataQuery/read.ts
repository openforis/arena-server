import { Express } from 'express'

import { ServiceRegistry } from '@openforis/arena-core'

import { ExpressInitializer } from '../../server'
import { ServerServiceType } from '../../server/arenaServer/serverServiceType'
import { DataQueryService } from '../../service'
import { Requests } from '../../utils'

import { ApiEndpoint } from '../endpoint'

export const DataQueryRead: ExpressInitializer = {
  init: (express: Express): void => {
    express.get(ApiEndpoint.dataQuery.dataQueriesCount(':surveyId'), (req, res, next) => {
      try {
        const { surveyId } = Requests.getParams(req)

        const service = ServiceRegistry.getInstance().getService(ServerServiceType.dataQuery)

        res.json({})
      } catch (error) {
        next(error)
      }
    })
  },
}
