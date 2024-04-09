import { Express } from 'express'

import { ServiceRegistry } from '@openforis/arena-core'

import { ExpressInitializer } from '../../server'
import { ServerServiceType } from '../../server/arenaServer/serverServiceType'
import { DataQueryService } from '../../service'
import { Requests } from '../../utils'

import { ApiEndpoint } from '../endpoint'

const getDataQueryService = (): DataQueryService =>
  ServiceRegistry.getInstance().getService(ServerServiceType.dataQuery)

export const DataQueryUpdate: ExpressInitializer = {
  init: (express: Express): void => {
    express.post(ApiEndpoint.dataQuery.dataQuery(':surveyId', ':queryUuid'), async (req, res, next) => {
      try {
        const { surveyId } = Requests.getParams(req)
        const querySummary = req.body

        const service = getDataQueryService()

        const querySummaryUpdated = await service.update({ surveyId, item: querySummary })

        res.json(querySummaryUpdated)
      } catch (error) {
        next(error)
      }
    })
  },
}
