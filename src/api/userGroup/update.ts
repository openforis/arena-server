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

export const UserGroupUpdate: ExpressInitializer = {
  init: (express: Express): void => {
    express.put(
      ApiEndpoint.userGroup.userGroup(':surveyId', ':groupUuid'),
      requireUserGroupManagePermission,
      async (req, res, next) => {
        try {
          const { groupUuid } = Requests.getParams(req)
          const { props } = req.body

          const service = getUserGroupService()
          const userGroupUpdated = await service.update({ uuid: groupUuid, props })

          res.json(userGroupUpdated)
        } catch (error) {
          next(error)
        }
      }
    )
  },
}
