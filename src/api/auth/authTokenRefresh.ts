import { Express, Response } from 'express'
import jwt from 'jsonwebtoken'

import { ServiceRegistry, ServiceType, UserAuthTokenService } from '@openforis/arena-core'
import { ProcessEnv } from '../../processEnv'
import { ExpressInitializer } from '../../server'
import { ApiEndpoint } from '../endpoint'

export const AuthTokenRefresh: ExpressInitializer = {
  init: (express: Express): void => {
    express.post(ApiEndpoint.auth.tokenRefresh(), async (req, res: Response) => {
      const jwtRefreshToken = req.cookies['refresh_token']

      if (!jwtRefreshToken) {
        return res.status(401).json({ message: 'Refresh token missing' })
      }

      try {
        const decodedPayload = jwt.verify(jwtRefreshToken, ProcessEnv.refreshTokenSecret)
        const { uuid } = decodedPayload as any

        const serviceRegistry = ServiceRegistry.getInstance()
        const userRefreshTokenService: UserAuthTokenService = serviceRegistry.getService(ServiceType.userAuthToken)

        const tokenRecord = await userRefreshTokenService.getByUuid(uuid)

        if (!tokenRecord || tokenRecord.revoked || new Date() > tokenRecord.expiresAt) {
          // If found but revoked/expired, reject. If not found, it's invalid.
          return res.status(401).json({ message: 'Invalid or revoked refresh token' })
        }
        const { userUuid } = tokenRecord
        const newAuthToken = userRefreshTokenService.createAuthToken({ userUuid })
        const newRefreshTokenRecord = await userRefreshTokenService.rotateRefreshToken({
          oldRefreshTokenUuid: uuid,
          userUuid,
          props: { userAgent: req.headers['user-agent'] ?? '' },
        })
        const cookieOptions = { httpOnly: true, secure: true }
        res.cookie('auth_token', newAuthToken, cookieOptions)
        res.cookie('refresh_token', newRefreshTokenRecord.token, {
          ...cookieOptions,
          expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        })
        return res.status(200).json({ message: 'Token refreshed successfully' })
      } catch (err) {
        return res.status(401).json({ message: 'Invalid refresh token' })
      }
    })
  },
}
