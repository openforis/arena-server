import { Algorithm } from 'jsonwebtoken'

export const jwtExpiresMs = 60 * 60 * 1000 // 1 hour
export const jwtRefreshTokenExpireMs = 7 * 24 * 60 * 60 * 1000 // 1 week
export const jwtDownloadTokenExpireMs = 30 * 60 * 1000 // 30 minutes

export const jwtAlgorithm: Algorithm = 'HS256'
export const jwtAlgorithms: Algorithm[] = [jwtAlgorithm]
