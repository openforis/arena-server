import { Express } from 'express'

import { ExpressInitializer } from '../../server'
import { Requests } from '../../utils'

import { ApiEndpoint } from '../endpoint'
import { ApiAuthMiddleware } from '../middleware'
import { getUserGroupBelongingToSurvey, getUserGroupService, sanitizeReadableGroupUuids } from './common'

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

          const { surveyUuid } = await getUserGroupBelongingToSurvey({ surveyId, groupUuid })
          const propsSanitized = await sanitizeReadableGroupUuids({ surveyUuid, groupUuid, props })

          const service = getUserGroupService()
          const userGroupUpdated = await service.update({ uuid: groupUuid, props: propsSanitized ?? props })

          res.json(userGroupUpdated)
        } catch (error) {
          next(error)
        }
      }
    )
  },
}
