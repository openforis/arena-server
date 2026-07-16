import { Express } from 'express'

import { ExpressInitializer } from '../../server'
import { Requests } from '../../utils'

import { ApiEndpoint } from '../endpoint'
import { ApiAuthMiddleware } from '../middleware'
import { getUserGroupBelongingToSurvey, getUserGroupService } from './common'

const { requireUserGroupManagePermission } = ApiAuthMiddleware

export const UserGroupUpdate: ExpressInitializer = {
  init: (express: Express): void => {
    express.put(
      ApiEndpoint.userGroup.userGroup(':surveyId', ':groupUuid'),
      requireUserGroupManagePermission,
      async (req, res, next) => {
        try {
          const { surveyId, groupUuid } = Requests.getParams(req)
          const { props } = req.body

          await getUserGroupBelongingToSurvey({ surveyId, groupUuid })

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
