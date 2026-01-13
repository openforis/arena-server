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

import { Logger } from '../../log'
import { ProcessEnv } from '../../processEnv'
import { UserRefreshTokenRepository } from '../../repository'
import { jwtAlgorithms, jwtExpiresMs, jwtRefreshTokenExpireMs } from './userAuthTokenServiceConstants'

const logger = new Logger('UserAuthTokenService')

/**
 * Signs a JWT token with the given payload.
 * @param payload - The payload to sign.
 * @returns The signed JWT token.
 */
const signToken = (payload: UserAuthTokenPayload): string => jwt.sign(payload, ProcessEnv.userAuthTokenSecret)

const createAuthTokenPayload = (options: { userUuid: string; now: Date; expiresAt: Date }): UserAuthTokenPayload => {
  const { userUuid, now, expiresAt } = options
  const nowMs = now.getTime()
  return {
    userUuid,
    iat: nowMs / 1000, // JWT 'issued at' is in seconds
    exp: expiresAt.getTime() / 1000, // JWT 'expiration' is in seconds
  }
}

/**
 * Creates a new auth token.
 *
 * @param options
 * @param options.userUuid - The UUID of the user for whom the auth token is being created.
 * @returns The created auth token along with its creation and expiration dates.
 */
const createAuthToken = (options: { userUuid: string }): { token: string; dateCreated: Date; expiresAt: Date } => {
  const { userUuid } = options
  const now = new Date()
  const expiresAt = new Date(now.getTime() + jwtExpiresMs)
  const payload: UserAuthTokenPayload = createAuthTokenPayload({ userUuid, now, expiresAt })
  const token = signToken(payload)
  return { token, dateCreated: now, expiresAt }
}

const createAndStoreRefreshToken = (
  options: { userUuid: string; props: UserAuthRefreshTokenProps },
  client: pgPromise.IBaseProtocol<any> = DB
): Promise<UserAuthRefreshToken> => {
  const { userUuid, props } = options
  const uuid = UUIDs.v4()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + jwtRefreshTokenExpireMs)
  const payload: UserAuthRefreshTokenPayload = {
    ...createAuthTokenPayload({ userUuid, now, expiresAt }),
    uuid,
  }
  const token = signToken(payload)
  const refreshToken = { uuid, userUuid, token, dateCreated: now, expiresAt, props }
  return UserRefreshTokenRepository.insert(refreshToken, client)
}

const verifyAndFetchRefreshTokenRecord = async ({
  refreshToken,
  userAuthTokenService,
  t,
}: {
  refreshToken: string
  userAuthTokenService: UserAuthTokenService
  t: pgPromise.IBaseProtocol<any>
}): Promise<UserAuthRefreshToken | null> => {
  try {
    const decodedPayload = userAuthTokenService.verifyAuthToken(refreshToken) as UserAuthRefreshTokenPayload
    const { uuid } = decodedPayload

    const tokenRecord = await UserRefreshTokenRepository.getByUuid(uuid, { includeRevoked: false }, t)

    if (!tokenRecord || tokenRecord.revoked || new Date() > tokenRecord.expiresAt) {
      // If found but revoked/expired, reject. If not found, it's invalid.
      return null
    }
    return tokenRecord
  } catch (error) {
    logger.error(`Error verifying and fetching refresh token record: ${error}`)
    return null
  }
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
      const tokenRecord = await verifyAndFetchRefreshTokenRecord({ refreshToken, userAuthTokenService: this, t })
      if (!tokenRecord) {
        return null
      }
      const { uuid, userUuid } = tokenRecord

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
    return jwt.verify(token, ProcessEnv.userAuthTokenSecret, { algorithms: jwtAlgorithms }) as P
  },
}

export { jwtExpiresMs, jwtRefreshTokenExpireMs } from './userAuthTokenServiceConstants'
