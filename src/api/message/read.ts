import { Express } from 'express'

import { ServiceRegistry } from '@openforis/arena-core'

import { ExpressInitializer } from '../../server/expressInitializer'
import { ServerServiceType } from '../../server/arenaServer/serverServiceType'
import { MessageService } from '../../service/message'

import { ApiEndpoint } from '../endpoint'
import { ApiAuthMiddleware } from '../middleware'
import { Requests } from '../../utils'

const { requireAdminPermission, requireLoggedInUser } = ApiAuthMiddleware

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

    express.get(ApiEndpoint.message.message(':uuid'), requireAdminPermission, async (req, res, next) => {
      try {
        const { uuid } = Requests.getParams(req)

        const service = getService()

        const message = await service.getByUuid(uuid)

        res.json({ message })
      } catch (error) {
        next(error)
      }
    })

    express.get(ApiEndpoint.message.messagesNotifiedToUserCount(), requireLoggedInUser, async (req, res, next) => {
      try {
        const service = getService()

        const user = Requests.getUser(req)

        const list = await service.getNotifiedToUser(user)

        res.json({ count: list.length })
      } catch (error) {
        next(error)
      }
    })

    express.get(ApiEndpoint.message.messagesNotifiedToUser(), requireLoggedInUser, async (req, res, next) => {
      try {
        const service = getService()

        const user = Requests.getUser(req)

        const list = await service.getNotifiedToUser(user)

        res.json({ list })
      } catch (error) {
        next(error)
      }
    })
  },
}
