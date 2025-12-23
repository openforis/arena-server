import { Express } from 'express'

import { ServiceRegistry } from '@openforis/arena-core'

import { ExpressInitializer } from '../../server'
import { ServerServiceType } from '../../server/arenaServer/serverServiceType'
import { MessageService } from '../../service'

import { ApiEndpoint } from '../endpoint'

const getService = (): MessageService =>
  ServiceRegistry.getInstance().getService(ServerServiceType.message) as MessageService

export const MessageRead: ExpressInitializer = {
  init: (express: Express): void => {
    express.get(ApiEndpoint.message.messagesCount(), async (_req, res, next) => {
      try {
        const service = getService()

        const count = await service.count()

        res.json({ count })
      } catch (error) {
        next(error)
      }
    })

    express.get(ApiEndpoint.message.messages(), async (_req, res, next) => {
      try {
        const service = getService()

        const list = await service.getAll()

        res.json({ list })
      } catch (error) {
        next(error)
      }
    })
  },
}
