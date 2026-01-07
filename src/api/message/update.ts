import { Express } from 'express'

import { ServiceRegistry } from '@openforis/arena-core'

import { ExpressInitializer } from '../../server'
import { ServerServiceType } from '../../server/arenaServer/serverServiceType'
import { MessageService } from '../../service'

import { ApiEndpoint } from '../endpoint'
import { ApiAuthMiddleware } from '../middleware'
import { Requests } from '../../utils'

const { requireAdminPermission } = ApiAuthMiddleware

const getService = (): MessageService => ServiceRegistry.getInstance().getService(ServerServiceType.message)

export const MessageUpdate: ExpressInitializer = {
  init: (express: Express): void => {
    express.put(ApiEndpoint.message.message(':uuid'), requireAdminPermission, async (req, res, next) => {
      try {
        const { uuid } = Requests.getParams(req)
        const message = req.body

        if (!message || typeof message !== 'object' || Array.isArray(message)) {
          res.status(400).json({ error: 'Invalid message payload' })
          return
        }

        const service = getService()

        const messageUpdated = await service.update(uuid, message)

        res.json(messageUpdated)
      } catch (error) {
        next(error)
      }
    })
  },
}
