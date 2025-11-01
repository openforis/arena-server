import { UserAuthRefreshToken, UserAuthRefreshTokenProps } from '@openforis/arena-core'
import { Request, Response } from 'express'

export const jwtRefreshTokenCookieName = 'refreshToken'

export const extractRefreshTokenProps = (options: { req: Request }): UserAuthRefreshTokenProps => {
  const { req } = options
  return { userAgent: req.headers['user-agent'] ?? '' }
}

export const setRefreshTokenCookie = (options: { res: Response; refreshToken: UserAuthRefreshToken }) => {
  const { res, refreshToken } = options
  const cookieOptions = { httpOnly: true, secure: true }
  res.cookie(jwtRefreshTokenCookieName, refreshToken.token, { ...cookieOptions, expires: refreshToken.expiresAt })
}
