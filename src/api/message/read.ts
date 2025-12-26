import { Express } from 'express'

import { ServiceRegistry } from '@openforis/arena-core'

import { ExpressInitializer } from '../../server'
import { ServerServiceType } from '../../server/arenaServer/serverServiceType'
import { MessageService } from '../../service'

import { ApiEndpoint } from '../endpoint'
import { ApiAuthMiddleware } from '../middleware'

const { requireAdminPermission } = ApiAuthMiddleware

const getService = (): MessageService =>
  ServiceRegistry.getInstance().getService(ServerServiceType.message) as MessageService

export const MessageRead: ExpressInitializer = {
  init: (express: Express): void => {
    // ==== READ ====
    express.get(ApiEndpoint.message.messagesCount(), requireAdminPermission, async (_req, res, next) => {
      try {
        const service = getService()

        const count = await service.count()

        res.json({ count })
      } catch (error) {
        next(error)
      }
    })

    express.get(ApiEndpoint.message.messages(), requireAdminPermission, async (_req, res, next) => {
      try {
        const service = getService()

        const list = await service.getAll()

        res.json({ list })
      } catch (error) {
        next(error)
      }
    })

    // ==== CREATE ====

    express.post(ApiEndpoint.message.message(), requireAdminPermission, async (req, res, next) => {
      try {
        const message = req.body

        const service = getService()

        const messagePersisted = await service.create(message)

        res.json({ message: messagePersisted })
      } catch (error) {
        next(error)
      }
    })
  },
}
