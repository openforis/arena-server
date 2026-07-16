import { Express } from 'express'

import { ExpressInitializer } from '../../server'
import { Requests } from '../../utils'

import { ApiEndpoint } from '../endpoint'
import { ApiAuthMiddleware } from '../middleware'
import { getSurveyUuid, getUserGroupBelongingToSurvey, getUserGroupService } from './common'

const { requireUserGroupManagePermission } = ApiAuthMiddleware

export const UserGroupCreate: ExpressInitializer = {
  init: (express: Express): void => {
    express.post(
      ApiEndpoint.userGroup.userGroups(':surveyId'),
      requireUserGroupManagePermission,
      async (req, res, next) => {
        try {
          const { surveyId } = Requests.getParams(req)
          const item = req.body

          const surveyUuid = await getSurveyUuid(surveyId)

          const service = getUserGroupService()
          const userGroupInserted = await service.insert({ surveyUuid, item })

          res.json(userGroupInserted)
        } catch (error) {
          next(error)
        }
      }
    )

    express.post(
      ApiEndpoint.userGroup.userGroupMembers(':surveyId', ':groupUuid'),
      requireUserGroupManagePermission,
      async (req, res, next) => {
        try {
          const { surveyId, groupUuid } = Requests.getParams(req)
          const { userUuid } = req.body

          await getUserGroupBelongingToSurvey({ surveyId, groupUuid })

          const service = getUserGroupService()
          await service.addMember({ groupUuid, userUuid })

          res.json({ groupUuid, userUuid })
        } catch (error) {
          next(error)
        }
      }
    )
  },
}
