import jwt from 'jsonwebtoken'

import { UserAuthTokenService, UserRefreshToken, UserRefreshTokenProps, UUIDs } from '@openforis/arena-core'

import { ProcessEnv } from '../../processEnv'
import { UserRefreshTokenRepository } from '../../repository'

const jwtExpireMs = 60 * 60 * 1000 // 1 hour
const jwtExpiresIn = '1h' // 1 hour

const jwtRefresshTokenExpireMs = 7 * 24 * 60 * 60 * 1000 // 1 week
const jwtRefreshExpiresIn = '1w' // 1 week

type JwtPayload = {
  userUuid: string
  uuid?: string
  exp: number
  iat: number
}

type RefreshTokenPayload = {
  uuid: string
  userUuid: string
  exp: number
  iat: number
}

export const UserRefreshTokenServiceServer: UserAuthTokenService = {
  createAuthToken(options: { userUuid: string }): string {
    const { userUuid } = options
    const now: number = Date.now()
    const tokenPayload: JwtPayload = {
      userUuid,
      iat: now,
      exp: now + jwtExpireMs,
    }
    const token = jwt.sign(JSON.stringify(tokenPayload), ProcessEnv.refreshTokenSecret, { expiresIn: jwtExpiresIn })
    return token
  },
  async createRefreshToken(options: { userUuid: string; props: UserRefreshTokenProps }): Promise<UserRefreshToken> {
    const { userUuid, props } = options
    const now = Date.now()
    const refreshTokenUuid = UUIDs.v4()
    const expiresAt = new Date(now + jwtRefresshTokenExpireMs)
    const refreshTokenPayload: RefreshTokenPayload = {
      uuid: refreshTokenUuid,
      userUuid,
      iat: now,
      exp: expiresAt.getTime(),
    }
    const token = jwt.sign(refreshTokenPayload, ProcessEnv.refreshTokenSecret, {
      expiresIn: jwtRefreshExpiresIn,
    })
    return UserRefreshTokenRepository.insert({ userUuid, token, expiresAt, props })
  },
  async getByUuid(tokenUuid: string): Promise<UserRefreshToken | null> {
    return UserRefreshTokenRepository.getByUuid(tokenUuid)
  },
  async revoke(options: { tokenUuid: string }): Promise<void> {
    const { tokenUuid } = options
    return UserRefreshTokenRepository.revoke(tokenUuid)
  },
  async revokeAll(options: { userUuid: string }): Promise<void> {
    const { userUuid } = options
    return UserRefreshTokenRepository.revokeAll({ userUuid })
  },
  async deleteExpired(): Promise<number> {
    return UserRefreshTokenRepository.deleteExpired()
  },
}
