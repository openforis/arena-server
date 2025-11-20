import { ServiceRegistry, ServiceType, UserAuthTokenService } from '@openforis/arena-core'

import { ExpressInitializer } from '../../server'
import { ApiEndpoint } from '../endpoint'
import { extractRefreshTokenProps, jwtRefreshTokenCookieName, setRefreshTokenCookie } from './authApiCommon'

export const AuthTokenRefresh: ExpressInitializer = {
  init: (express): void => {
    express.post(ApiEndpoint.auth.tokenRefresh(), async (req, res) => {
      const refreshToken = req.cookies?.[jwtRefreshTokenCookieName]

      const serviceRegistry = ServiceRegistry.getInstance()
      const userRefreshTokenService: UserAuthTokenService = serviceRegistry.getService(ServiceType.userAuthToken)

      const authTokenRotationResult = await userRefreshTokenService.rotateTokens({
        refreshToken,
        refreshTokenProps: extractRefreshTokenProps({ req }),
      })
      if (!authTokenRotationResult) {
        return res.status(401).json({ message: 'Invalid or revoked refresh token' })
      }
      const { authToken, refreshToken: newRefreshToken } = authTokenRotationResult

      setRefreshTokenCookie({ res, refreshToken: newRefreshToken })

      return res.status(200).json({ authToken: authToken.token, message: 'Token refreshed successfully' })
    })
  },
}
