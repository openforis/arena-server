import { CookieOptions, Request, Response } from 'express'

import { UserAuthRefreshToken, UserAuthRefreshTokenProps } from '@openforis/arena-core'

import { ApiEndpoint } from '../endpoint'
import { NodeEnv, ProcessEnv } from '../../processEnv'
import { Requests } from '../../utils'

export const jwtRefreshTokenCookieName = 'refreshToken'

export const extractRefreshTokenProps = ({ req }: { req: Request }): UserAuthRefreshTokenProps => {
  const { appInfo } = Requests.getParams(req)
  return {
    appInfo,
    userAgent: req.headers['user-agent'] ?? '',
  }
}

export const setRefreshTokenCookie = ({ res, refreshToken }: { res: Response; refreshToken: UserAuthRefreshToken }) => {
  const secure = ProcessEnv.nodeEnv === NodeEnv.production || ProcessEnv.useHttps
  // Use 'lax' for localhost, 'strict' for production
  const sameSite = ProcessEnv.nodeEnv === NodeEnv.production ? 'strict' : 'lax'

  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure,
    sameSite,
    path: ApiEndpoint.auth.tokenRefresh(),
    expires: refreshToken.expiresAt,
  }
  res.cookie(jwtRefreshTokenCookieName, refreshToken.token, cookieOptions)
}
