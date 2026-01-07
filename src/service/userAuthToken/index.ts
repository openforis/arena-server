import jwt from 'jsonwebtoken'
import pgPromise from 'pg-promise'

import {
  UserAuthRefreshToken,
  UserAuthRefreshTokenPayload,
  UserAuthRefreshTokenProps,
  UserAuthToken,
  UserAuthTokenPayload,
  UserAuthTokenService,
  UserTokenPayload,
  UUIDs,
} from '@openforis/arena-core'

import { DB } from '../../db'

import { ProcessEnv } from '../../processEnv'
import { UserRefreshTokenRepository } from '../../repository'
import { jwtExpiresMs, jwtRefresshTokenExpireMs } from './userAuthTokenServiceConstants'

const signToken = (payload: UserAuthTokenPayload): string => jwt.sign(payload, ProcessEnv.userAuthTokenSecret)

const createAuthToken = (options: { userUuid: string }) => {
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
}

function createAndStoreRefreshToken(
  options: { userUuid: string; props: UserAuthRefreshTokenProps },
  client: pgPromise.IBaseProtocol<any> = DB
) {
  const { userUuid, props } = options
  const uuid = UUIDs.v4()
  const now = Date.now()
  const expiresAt = new Date(now + jwtRefresshTokenExpireMs)
  const payload: UserAuthRefreshTokenPayload = {
    uuid,
    userUuid,
    iat: now,
    exp: expiresAt.getTime(),
  }
  const token = signToken(payload)
  const refreshToken = { uuid, userUuid, token, dateCreated: new Date(now), expiresAt, props }
  return UserRefreshTokenRepository.insert(refreshToken, client)
}

export const UserAuthTokenServiceServer: UserAuthTokenService = {
  async createTokens(
    options: { userUuid: string; props: UserAuthRefreshTokenProps },
    dbClient?: any
  ): Promise<{ authToken: UserAuthToken; refreshToken: UserAuthRefreshToken }> {
    const { userUuid, props } = options
    const authToken = createAuthToken({ userUuid })
    const refreshToken = await createAndStoreRefreshToken({ userUuid, props }, dbClient)
    return { authToken, refreshToken }
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
  async rotateTokens(
    options: {
      refreshToken: string
      refreshTokenProps: UserAuthRefreshTokenProps
    },
    dbClient: any = DB
  ): Promise<{ authToken: UserAuthToken; refreshToken: UserAuthRefreshToken } | null> {
    const { refreshToken, refreshTokenProps } = options
    if (!refreshToken) {
      return null
    }
    return dbClient.tx(async (t: pgPromise.ITask<any>) => {
      const decodedPayload = this.verifyAuthToken(refreshToken) as UserAuthRefreshTokenPayload
      const { uuid } = decodedPayload

      const tokenRecord = await UserRefreshTokenRepository.getByUuid(uuid)

      if (!tokenRecord || tokenRecord.revoked || new Date() > tokenRecord.expiresAt) {
        // If found but revoked/expired, reject. If not found, it's invalid.
        return null
      }
      const { userUuid } = tokenRecord
      const newAuthToken = createAuthToken({ userUuid })

      await UserRefreshTokenRepository.revoke(uuid, t)

      const newRefreshToken = await createAndStoreRefreshToken({ userUuid, props: refreshTokenProps }, t)

      return { authToken: newAuthToken, refreshToken: newRefreshToken }
    })
  },
  async deleteExpired(): Promise<number> {
    return UserRefreshTokenRepository.deleteExpired()
  },
  verifyAuthToken<P extends UserTokenPayload>(token: string): P {
    return jwt.verify(token, ProcessEnv.userAuthTokenSecret) as P
  },
}

export { jwtExpiresMs, jwtRefresshTokenExpireMs } from './userAuthTokenServiceConstants'
