import jwt from 'jsonwebtoken'

import { UserRefreshToken, UserRefreshTokenProps, UserRefreshTokenService, UUIDs } from '@openforis/arena-core'

import { ProcessEnv } from '../../processEnv'
import { UserRefreshTokenRepository } from '../../repository'

const jwtRefresshTokenExpireMs = 7 * 24 * 60 * 60 * 1000 // 1 week
const jwtRefreshExpiresIn = '1w' // 1 week

type RefreshTokenPayload = {
  uuid: string
  userUuid: string
  exp: number
  iat: number
}

export const UserRefreshTokenServiceServer: UserRefreshTokenService = {
  async create(options: { userUuid: string; props: UserRefreshTokenProps }): Promise<UserRefreshToken> {
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
