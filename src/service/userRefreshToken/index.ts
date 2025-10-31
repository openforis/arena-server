import jwt from 'jsonwebtoken'
import pgPromise from 'pg-promise'

import {
  UserAuthToken,
  UserAuthTokenService,
  UserRefreshToken,
  UserRefreshTokenProps,
  UUIDs,
} from '@openforis/arena-core'

import { DB } from '../../db'

import { ProcessEnv } from '../../processEnv'
import { UserRefreshTokenRepository } from '../../repository'
import {
  jwtExpiresIn,
  jwtExpiresMs,
  jwtRefreshExpiresIn,
  jwtRefresshTokenExpireMs,
} from './userRefreshTokenServiceConstants'

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

const createRefreshTokenInternal = (options: { userUuid: string }): { token: string; expiresAt: Date } => {
  const { userUuid } = options
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
  return { token, expiresAt }
}

export const UserRefreshTokenServiceServer: UserAuthTokenService = {
  createAuthToken(options: { userUuid: string }): UserAuthToken {
    const { userUuid } = options
    const nowMs: number = Date.now()
    const tokenPayload: JwtPayload = {
      userUuid,
      iat: nowMs,
      exp: nowMs + jwtExpiresMs,
    }
    const token = jwt.sign(JSON.stringify(tokenPayload), ProcessEnv.refreshTokenSecret, { expiresIn: jwtExpiresIn })
    return { token, dateCreated: new Date(nowMs), expiresAt: new Date(nowMs + jwtExpiresMs) }
  },
  async createRefreshToken(
    options: { userUuid: string; props: UserRefreshTokenProps },
    client = DB
  ): Promise<UserRefreshToken> {
    const { userUuid, props } = options
    const { token, expiresAt } = createRefreshTokenInternal({ userUuid })
    return UserRefreshTokenRepository.insert({ userUuid, token, expiresAt, props }, client)
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
  async rotateRefreshToken(
    options: { oldRefreshTokenUuid: string; userUuid: string; props: UserRefreshTokenProps },
    client: pgPromise.IDatabase<any> = DB
  ): Promise<UserRefreshToken> {
    return client.tx(async (t) => {
      const { oldRefreshTokenUuid, userUuid, props } = options
      await UserRefreshTokenRepository.revoke(oldRefreshTokenUuid, t)
      return this.createRefreshToken({ userUuid, props }, t)
    })
  },
  async rotateTokens(options: {
    refreshToken: string
    refreshTokenProps: UserRefreshTokenProps
  }): Promise<{ authToken: UserAuthToken; refreshToken: UserRefreshToken } | null> {
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

export {
  jwtExpiresIn,
  jwtExpiresMs,
  jwtRefreshExpiresIn,
  jwtRefresshTokenExpireMs,
} from './userRefreshTokenServiceConstants'
