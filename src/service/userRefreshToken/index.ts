import jwt from 'jsonwebtoken'
import pgPromise from 'pg-promise'

import {
  UserAuthRefreshToken,
  UserAuthRefreshTokenPayload,
  UserAuthRefreshTokenProps,
  UserAuthToken,
  UserAuthTokenPayload,
  UserAuthTokenService,
  UUIDs,
} from '@openforis/arena-core'

import { DB } from '../../db'

import { ProcessEnv } from '../../processEnv'
import { UserRefreshTokenRepository } from '../../repository'
import { jwtExpiresMs, jwtRefresshTokenExpireMs } from './userRefreshTokenServiceConstants'

const signToken = (payload: object): string => jwt.sign(payload, ProcessEnv.refreshTokenSecret)

const createRefreshTokenInternal = (options: { userUuid: string }): UserAuthRefreshToken => {
  const { userUuid } = options
  const now = Date.now()
  const uuid = UUIDs.v4()
  const expiresAt = new Date(now + jwtRefresshTokenExpireMs)
  const payload: UserAuthRefreshTokenPayload = {
    uuid,
    userUuid,
    iat: now,
    exp: expiresAt.getTime(),
  }
  const token = signToken(payload)
  return { uuid, userUuid, token, dateCreated: new Date(now), expiresAt, props: {} }
}

export const UserRefreshTokenServiceServer: UserAuthTokenService = {
  createAuthToken(options: { userUuid: string }): UserAuthToken {
    const { userUuid } = options
    const now = Date.now()
    const expiresAt = new Date(now + jwtExpiresMs)
    const payload: UserAuthTokenPayload = {
      userUuid,
      iat: now,
      exp: expiresAt.getTime(),
    }
    const token = signToken(payload)
    return { token, dateCreated: new Date(now), expiresAt }
  },
  async createRefreshToken(
    options: { userUuid: string; props: UserAuthRefreshTokenProps },
    client = DB
  ): Promise<UserAuthRefreshToken> {
    const { userUuid, props } = options
    const { uuid, token, expiresAt } = createRefreshTokenInternal({ userUuid })
    return UserRefreshTokenRepository.insert({ uuid, userUuid, token, expiresAt, props }, client)
  },
  async getByUuid(tokenUuid: string): Promise<UserAuthRefreshToken | null> {
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
  async rotateRefreshToken(
    options: { oldRefreshTokenUuid: string; userUuid: string; props: UserAuthRefreshTokenProps },
    client: pgPromise.IDatabase<any> = DB
  ): Promise<UserAuthRefreshToken> {
    return client.tx(async (t) => {
      const { oldRefreshTokenUuid, userUuid, props } = options
      await UserRefreshTokenRepository.revoke(oldRefreshTokenUuid, t)
      return this.createRefreshToken({ userUuid, props }, t)
    })
  },
  async rotateTokens(options: {
    refreshToken: string
    refreshTokenProps: UserAuthRefreshTokenProps
  }): Promise<{ authToken: UserAuthToken; refreshToken: UserAuthRefreshToken } | null> {
    const { refreshToken, refreshTokenProps } = options
    if (!refreshToken) {
      return null
    }
    try {
      const decodedPayload = jwt.verify(refreshToken, ProcessEnv.refreshTokenSecret)
      const { uuid } = decodedPayload as any

      const tokenRecord = await UserRefreshTokenRepository.getByUuid(uuid)

      if (!tokenRecord || tokenRecord.revoked || new Date() > tokenRecord.expiresAt) {
        // If found but revoked/expired, reject. If not found, it's invalid.
        return null
      }
      const { userUuid } = tokenRecord
      const newAuthToken = this.createAuthToken({ userUuid })
      const newRefreshToken = await this.rotateRefreshToken({
        oldRefreshTokenUuid: uuid,
        userUuid,
        props: refreshTokenProps,
      })
      return { authToken: newAuthToken, refreshToken: newRefreshToken }
    } catch (err) {
      return null
    }
  },
  async deleteExpired(): Promise<number> {
    return UserRefreshTokenRepository.deleteExpired()
  },
}

export { jwtExpiresMs, jwtRefresshTokenExpireMs } from './userRefreshTokenServiceConstants'
