import { Express } from 'express'

import { ServiceRegistry } from '@openforis/arena-core'

import { ExpressInitializer } from '../../server'
import { ServerServiceType } from '../../server/arenaServer/serverServiceType'
import { MessageService } from '../../service'

import { ApiEndpoint } from '../endpoint'
import { ApiAuthMiddleware } from '../middleware'

const { requireAdminPermission } = ApiAuthMiddleware

const getService = (): MessageService => ServiceRegistry.getInstance().getService(ServerServiceType.message)

export const MessageCreate: ExpressInitializer = {
  init: (express: Express): void => {
    express.post(ApiEndpoint.message.message(), requireAdminPermission, async (req, res, next) => {
      try {
        const message = req.body

        const service = getService()

        const messageInserted = await service.create(message)

        res.json(messageInserted)
      } catch (error) {
        next(error)
      }
    })
  },
}
