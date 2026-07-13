import { Express } from 'express'

import { ServiceRegistry } from '@openforis/arena-core'

import { ExpressInitializer } from '../../server'
import { ServerServiceType } from '../../server/arenaServer/serverServiceType'
import { UserGroupService } from '../../service'
import { Requests } from '../../utils'

import { ApiEndpoint } from '../endpoint'
import { ApiAuthMiddleware } from '../middleware'

const { requireUserGroupManagePermission } = ApiAuthMiddleware

const getUserGroupService = (): UserGroupService =>
  ServiceRegistry.getInstance().getService(ServerServiceType.userGroup) as UserGroupService

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
