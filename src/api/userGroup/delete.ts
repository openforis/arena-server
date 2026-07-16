import { Express } from 'express'

import { ExpressInitializer } from '../../server'
import { Requests } from '../../utils'

import { ApiEndpoint } from '../endpoint'
import { ApiAuthMiddleware } from '../middleware'
import { getUserGroupBelongingToSurvey, getUserGroupService } from './common'

const { requireUserGroupManagePermission } = ApiAuthMiddleware

export const UserGroupDelete: ExpressInitializer = {
  init: (express: Express): void => {
    express.delete(
      ApiEndpoint.userGroup.userGroup(':surveyId', ':groupUuid'),
      requireUserGroupManagePermission,
      async (req, res, next) => {
        try {
          const { surveyId, groupUuid } = Requests.getParams(req)

          await getUserGroupBelongingToSurvey({ surveyId, groupUuid })

          const service = getUserGroupService()
          const userGroupDeleted = await service.deleteItem({ uuid: groupUuid })

          res.json(userGroupDeleted)
        } catch (error) {
          next(error)
        }
      }
    )

    express.delete(
      ApiEndpoint.userGroup.userGroupMember(':surveyId', ':groupUuid', ':userUuid'),
      requireUserGroupManagePermission,
      async (req, res, next) => {
        try {
          const { surveyId, groupUuid, userUuid } = Requests.getParams(req)

          await getUserGroupBelongingToSurvey({ surveyId, groupUuid })

          const service = getUserGroupService()
          await service.removeMember({ groupUuid, userUuid })

          res.json({ groupUuid, userUuid })
        } catch (error) {
          next(error)
        }
      }
    )
  },
}
