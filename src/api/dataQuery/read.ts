import { Express } from 'express'

import { ServiceRegistry } from '@openforis/arena-core'

import { ExpressInitializer } from '../../server'
import { ServerServiceType } from '../../server/arenaServer/serverServiceType'
import { DataQueryService } from '../../service'
import { Requests } from '../../utils'

import { ApiEndpoint } from '../endpoint'

const getDataQueryService = (): DataQueryService =>
  ServiceRegistry.getInstance().getService(ServerServiceType.dataQuery) as DataQueryService

export const DataQueryRead: ExpressInitializer = {
  init: (express: Express): void => {
    express.get(ApiEndpoint.dataQuery.dataQueriesCount(':surveyId'), async (req, res, next) => {
      try {
        const { surveyId } = Requests.getParams(req)

        const service = getDataQueryService()

        const count = await service.count({ surveyId })

        res.json({ count })
      } catch (error) {
        next(error)
      }
    })

    express.get(ApiEndpoint.dataQuery.dataQueries(':surveyId'), async (req, res, next) => {
      try {
        const { surveyId } = Requests.getParams(req)

        const service = getDataQueryService()

        const list = await service.getAll({ surveyId })

        res.json({ list })
      } catch (error) {
        next(error)
      }
    })

    express.get(ApiEndpoint.dataQuery.dataQuery(':surveyId', ':querySummaryUuid'), async (req, res, next) => {
      try {
        const { surveyId, querySummaryUuid } = Requests.getParams(req)

        const service = getDataQueryService()

        const dataQuerySummary = await service.getByUuid({ surveyId, uuid: querySummaryUuid })

        res.json(dataQuerySummary)
      } catch (error) {
        next(error)
      }
    })
  },
}
