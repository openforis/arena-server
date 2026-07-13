import { Express } from 'express'

import { ServiceRegistry, ServiceType, SurveyService } from '@openforis/arena-core'

import { ExpressInitializer } from '../../server'
import { ServerServiceType } from '../../server/arenaServer/serverServiceType'
import { UserGroupService } from '../../service'
import { Requests } from '../../utils'

import { ApiEndpoint } from '../endpoint'
import { ApiAuthMiddleware } from '../middleware'

const { requireSurveyViewPermission } = ApiAuthMiddleware

const getUserGroupService = (): UserGroupService =>
  ServiceRegistry.getInstance().getService(ServerServiceType.userGroup) as UserGroupService

const getSurveyUuid = async (surveyId: number): Promise<string> => {
  const surveyService = ServiceRegistry.getInstance().getService(ServiceType.survey) as SurveyService
  const survey = await surveyService.get({ surveyId })
  return survey.uuid
}

export const UserGroupRead: ExpressInitializer = {
  init: (express: Express): void => {
    express.get(
      ApiEndpoint.userGroup.userGroupsCount(':surveyId'),
      requireSurveyViewPermission,
      async (req, res, next) => {
        try {
          const { surveyId } = Requests.getParams(req)
          const surveyUuid = await getSurveyUuid(surveyId)

          const service = getUserGroupService()
          const count = await service.count({ surveyUuid })

          res.json({ count })
        } catch (error) {
          next(error)
        }
      }
    )

    express.get(ApiEndpoint.userGroup.userGroups(':surveyId'), requireSurveyViewPermission, async (req, res, next) => {
      try {
        const { surveyId } = Requests.getParams(req)
        const surveyUuid = await getSurveyUuid(surveyId)

        const service = getUserGroupService()
        const list = await service.getAll({ surveyUuid })

        res.json({ list })
      } catch (error) {
        next(error)
      }
    })

    express.get(
      ApiEndpoint.userGroup.userGroup(':surveyId', ':groupUuid'),
      requireSurveyViewPermission,
      async (req, res, next) => {
        try {
          const { groupUuid } = Requests.getParams(req)

          const service = getUserGroupService()
          const userGroup = await service.getByUuid({ uuid: groupUuid })

          res.json(userGroup)
        } catch (error) {
          next(error)
        }
      }
    )

    express.get(
      ApiEndpoint.userGroup.userGroupMembers(':surveyId', ':groupUuid'),
      requireSurveyViewPermission,
      async (req, res, next) => {
        try {
          const { groupUuid } = Requests.getParams(req)

          const service = getUserGroupService()
          const list = await service.getMembers({ groupUuid })

          res.json({ list })
        } catch (error) {
          next(error)
        }
      }
    )
  },
}
