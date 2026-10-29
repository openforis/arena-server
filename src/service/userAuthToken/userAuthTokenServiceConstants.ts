import { Algorithm } from 'jsonwebtoken'

export const jwtExpiresMs = 60 * 60 * 1000 // 1 hour
export const jwtRefreshTokenExpireMs = 7 * 24 * 60 * 60 * 1000 // 1 week
// Arena Mobile is used offline in the field for weeks: a longer lifetime avoids frequent logins
export const jwtRefreshTokenMobileExpireMs = 30 * 24 * 60 * 60 * 1000 // 30 days
export const arenaMobileAppId = 'am'
export const jwtDownloadTokenExpireMs = 30 * 60 * 1000 // 30 minutes

export const jwtAlgorithm: Algorithm = 'HS256'
export const jwtAlgorithms: Algorithm[] = [jwtAlgorithm]
