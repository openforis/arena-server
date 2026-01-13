import { ServiceRegistry, ServiceType, UserAuthTokenService } from '@openforis/arena-core'

import { ExpressInitializer } from '../../server'
import { ApiEndpoint } from '../endpoint'
import { extractRefreshTokenProps, jwtRefreshTokenCookieName, setRefreshTokenCookie } from './authApiCommon'

export const AuthTokenRefresh: ExpressInitializer = {
  init: (express): void => {
    express.post(ApiEndpoint.auth.tokenRefresh(), async (req, res, next) => {
      try {
        const refreshToken = req.cookies?.[jwtRefreshTokenCookieName]

        const serviceRegistry = ServiceRegistry.getInstance()
        const userRefreshTokenService: UserAuthTokenService = serviceRegistry.getService(ServiceType.userAuthToken)

        const authTokenRotationResult = await userRefreshTokenService.rotateTokens({
          refreshToken,
          refreshTokenProps: extractRefreshTokenProps({ req }),
        })
        if (!authTokenRotationResult) {
          res.status(401).json({ message: 'Invalid or revoked refresh token' })
          return
        }
        const { authToken, refreshToken: newRefreshToken } = authTokenRotationResult

        setRefreshTokenCookie({ res, refreshToken: newRefreshToken })

        res.json({ authToken: authToken.token, message: 'Token refreshed successfully' })
      } catch (error: any) {
        next(error)
      }
    })
  },
}
