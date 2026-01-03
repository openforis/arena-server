import { Express } from 'express'

import { ServiceRegistry } from '@openforis/arena-core'

import { ExpressInitializer } from '../../server'
import { ServerServiceType } from '../../server/arenaServer/serverServiceType'
import { MessageService } from '../../service'
import { Requests } from '../../utils'

import { ApiEndpoint } from '../endpoint'
import { ApiAuthMiddleware } from '../middleware'

const { requireAdminPermission } = ApiAuthMiddleware

const getService = (): MessageService => ServiceRegistry.getInstance().getService(ServerServiceType.message)

export const MessageDelete: ExpressInitializer = {
  init: (express: Express): void => {
    express.delete(ApiEndpoint.message.message(':uuid'), requireAdminPermission, async (req, res, next) => {
      try {
        const { uuid } = Requests.getParams(req)

        const service = getService()

        await service.deleteByUuid(uuid)

        res.json({ success: true })
      } catch (error) {
        next(error)
      }
    })
  },
}
