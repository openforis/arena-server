import { Express } from 'express'

import { ServiceRegistry } from '@openforis/arena-core'

import { ExpressInitializer } from '../../server'
import { ServerServiceType } from '../../server/arenaServer/serverServiceType'
import { MessageService } from '../../service'

import { ApiEndpoint } from '../endpoint'
import { ApiAuthMiddleware } from '../middleware'

const { requireAdminPermission } = ApiAuthMiddleware

const getService = (): MessageService => ServiceRegistry.getInstance().getService(ServerServiceType.message)

export const MessageUpdate: ExpressInitializer = {
  init: (express: Express): void => {
    express.put(ApiEndpoint.message.message(), requireAdminPermission, async (req, res, next) => {
      try {
        const message = req.body

        const service = getService()

        const messageUpdated = await service.update(message.uuid, message)

        res.json(messageUpdated)
      } catch (error) {
        next(error)
      }
    })
  },
}
