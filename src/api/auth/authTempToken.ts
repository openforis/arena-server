import { ServiceRegistry } from '@openforis/arena-core'

import { ExpressInitializer, ServerServiceType } from '../../server'
import { UserTempAuthTokenService } from '../../service'
import { Requests } from '../../utils'
import { ApiEndpoint } from '../endpoint'

export const AuthTempToken: ExpressInitializer = {
  init: (express): void => {
    express.post(ApiEndpoint.auth.tempAuthToken(), async (req, res, next) => {
      try {
        const user = Requests.getUser(req)

        const serviceRegistry = ServiceRegistry.getInstance()
        const service: UserTempAuthTokenService = serviceRegistry.getService(ServerServiceType.userTempAuthToken)
        const tempAuthToken = await service.create({ userUuid: user.uuid })

        res.json({ tempAuthToken })
      } catch (error) {
        next(error)
      }
    })
  },
}
