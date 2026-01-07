import { CookieOptions, Request, Response } from 'express'

import { UserAuthRefreshToken, UserAuthRefreshTokenProps } from '@openforis/arena-core'

import { ApiEndpoint } from '../endpoint'
import { ProcessEnv } from '../../processEnv'

const arenaAppId = 'arena'
export const jwtRefreshTokenCookieName = 'refreshToken'

export const extractRefreshTokenProps = (options: { req: Request }): UserAuthRefreshTokenProps => {
  const { req } = options
  return {
    appInfo: {
      appId: arenaAppId,
      version: ProcessEnv.applicationVersion,
    },
    userAgent: req.headers['user-agent'] ?? '',
  }
}

export const setRefreshTokenCookie = (options: { res: Response; refreshToken: UserAuthRefreshToken }) => {
  const { res, refreshToken } = options
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: ApiEndpoint.auth.tokenRefresh(),
    expires: refreshToken.expiresAt,
  }
  res.cookie(jwtRefreshTokenCookieName, refreshToken.token, cookieOptions)
}
