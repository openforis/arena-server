import { Express } from 'express'

import { ExpressInitializer } from '../../server'
import { Requests } from '../../utils'

import { ApiEndpoint } from '../endpoint'
import { ApiAuthMiddleware } from '../middleware'
import { getUserGroupService } from './common'

const { requireUserGroupManagePermission } = ApiAuthMiddleware

export const UserGroupDelete: ExpressInitializer = {
  init: (express: Express): void => {
    express.delete(
      ApiEndpoint.userGroup.userGroup(':surveyId', ':groupUuid'),
      requireUserGroupManagePermission,
      async (req, res, next) => {
        try {
          const { groupUuid } = Requests.getParams(req)

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
          const { groupUuid, userUuid } = Requests.getParams(req)

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
