import { UserAuthRefreshToken, UserAuthRefreshTokenProps, UserAuthToken } from '@openforis/arena-core'
import { Request, Response } from 'express'

export const jwtCookieName = 'jwt'
export const jwtRefreshTokenCookieName = 'refreshToken'

export const extractRefreshTokenProps = (options: { req: Request }): UserAuthRefreshTokenProps => {
  const { req } = options
  return { userAgent: req.headers['user-agent'] ?? '' }
}

export const setAuthCookies = (options: {
  res: Response
  authToken: UserAuthToken
  refreshToken: UserAuthRefreshToken
}) => {
  const { res, authToken, refreshToken } = options
  const cookieOptions = { httpOnly: true, secure: true }
  res.cookie(jwtCookieName, authToken.token, { ...cookieOptions, expires: authToken.expiresAt })
  res.cookie(jwtRefreshTokenCookieName, refreshToken.token, { ...cookieOptions, expires: refreshToken.expiresAt })
}
