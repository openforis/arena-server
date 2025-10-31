import { UserAuthToken, UserRefreshToken, UserRefreshTokenProps } from '@openforis/arena-core'
import { Request, Response } from 'express'

export const jwtCookieName = 'jwt'
export const jwtRefreshTokenCookieName = 'refreshToken'

export const extractRefreshTokenProps = (options: { req: Request }): UserRefreshTokenProps => {
  const { req } = options
  return { userAgent: req.headers['user-agent'] ?? '' }
}

export const setAuthCookies = (options: {
  res: Response
  authToken: UserAuthToken
  refreshToken: UserRefreshToken
}) => {
  const { res, authToken, refreshToken } = options
  const cookieOptions = { httpOnly: true, secure: true }
  res.cookie(jwtCookieName, authToken, { ...cookieOptions, expires: authToken.expiresAt })
  res.cookie(jwtRefreshTokenCookieName, refreshToken.token, { ...cookieOptions, expires: refreshToken.expiresAt })
}
