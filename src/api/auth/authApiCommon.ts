import { CookieOptions, Request, Response } from 'express'

import { UserAuthRefreshToken, UserAuthRefreshTokenProps } from '@openforis/arena-core'

import { ApiEndpoint } from '../endpoint'
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
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: ApiEndpoint.auth.tokenRefresh(),
    expires: refreshToken.expiresAt,
  }
  res.cookie(jwtRefreshTokenCookieName, refreshToken.token, cookieOptions)
}
