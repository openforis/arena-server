import { Express } from 'express'

import { ServiceRegistry } from '@openforis/arena-core'

import { ExpressInitializer } from '../../server'
import { ServerServiceType } from '../../server/arenaServer/serverServiceType'
import { DataQueryService } from '../../service'
import { Requests } from '../../utils'

import { ApiEndpoint } from '../endpoint'

const getDataQueryService = (): DataQueryService =>
  ServiceRegistry.getInstance().getService(ServerServiceType.dataQuery)

export const DataQueryDelete: ExpressInitializer = {
  init: (express: Express): void => {
    express.delete(ApiEndpoint.dataQuery.dataQuery(':surveyId', ':queryUuid'), async (req, res, next) => {
      try {
        const { surveyId, queryUuid } = Requests.getParams(req)

        const service = getDataQueryService()

        const querySummaryUpdated = await service.deleteItem({ surveyId, uuid: queryUuid })

        res.json(querySummaryUpdated)
      } catch (error) {
        next(error)
      }
    })
  },
}
