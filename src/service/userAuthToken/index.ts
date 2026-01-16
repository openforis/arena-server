import jwt from 'jsonwebtoken'
import pgPromise from 'pg-promise'

import {
  AuthToken,
  DownloadAuthTokenPayload,
  UserAuthRefreshToken,
  UserAuthRefreshTokenPayload,
  UserAuthRefreshTokenProps,
  UserAuthTokenPayload,
  UserAuthTokenService,
  UserTokenPayload,
  UUIDs,
} from '@openforis/arena-core'

import { DB } from '../../db'

import { Logger } from '../../log'
import { ProcessEnv } from '../../processEnv'
import { UserRefreshTokenRepository } from '../../repository'
import {
  jwtAlgorithm,
  jwtAlgorithms,
  jwtDownloadTokenExpireMs,
  jwtExpiresMs,
  jwtRefreshTokenExpireMs,
} from './userAuthTokenServiceConstants'

const logger = new Logger('UserAuthTokenService')

/**
 * Signs a JWT token with the given payload.
 *
 * @param payload - The payload to sign.
 * @param expiresInSeconds - The expiration time in seconds.
 * @returns The signed JWT token.
 */
const signToken = (payload: UserTokenPayload, expiresInSeconds: number): string =>
  jwt.sign(payload, ProcessEnv.userAuthTokenSecret, { expiresIn: expiresInSeconds, algorithm: jwtAlgorithm })

const createUserAuthTokenPayload = ({ userUuid }: { userUuid: string }): UserAuthTokenPayload => ({ userUuid })

const createDownloadAuthTokenPayload = ({
  userUuid,
  fileName,
}: {
  userUuid: string
  fileName: string
}): DownloadAuthTokenPayload => ({
  userUuid,
  fileName,
})

const createAuthTokenFromPayload = (payload: UserTokenPayload, expiresMs: number): AuthToken => {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + expiresMs)
  const token = signToken(payload, expiresMs / 1000)
  return { token, dateCreated: now, expiresAt }
}

/**
 * Creates a new user auth token.
 *
 * @param options
 * @param options.userUuid - The UUID of the user for whom the auth token is being created.
 * @returns The created auth token along with its creation and expiration dates.
 */
const createUserAuthToken = ({
  userUuid,
}: {
  userUuid: string
}): { token: string; dateCreated: Date; expiresAt: Date } => {
  const payload: UserAuthTokenPayload = createUserAuthTokenPayload({ userUuid })
  return createAuthTokenFromPayload(payload, jwtExpiresMs)
}

const createAndStoreRefreshToken = (
  { userUuid, props }: { userUuid: string; props: UserAuthRefreshTokenProps },
  client: pgPromise.IBaseProtocol<any> = DB
): Promise<UserAuthRefreshToken> => {
  const uuid = UUIDs.v4()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + jwtRefreshTokenExpireMs)
  const payload: UserAuthRefreshTokenPayload = { ...createUserAuthTokenPayload({ userUuid }), uuid }
  const token = signToken(payload, jwtRefreshTokenExpireMs / 1000)
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
  async createUserAuthTokens(
    options: { userUuid: string; props: UserAuthRefreshTokenProps },
    dbClient?: any
  ): Promise<{ authToken: AuthToken; refreshToken: UserAuthRefreshToken }> {
    const { userUuid, props } = options
    const authToken = createUserAuthToken({ userUuid })
    const refreshToken = await createAndStoreRefreshToken({ userUuid, props }, dbClient)
    return { authToken, refreshToken }
  },
  createDownloadAuthToken({ userUuid, fileName }: { userUuid: string; fileName: string }): AuthToken {
    const payload = createDownloadAuthTokenPayload({ userUuid, fileName })
    return createAuthTokenFromPayload(payload, jwtDownloadTokenExpireMs)
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
  ): Promise<{ authToken: AuthToken; refreshToken: UserAuthRefreshToken } | null> {
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

      const newAuthToken = createUserAuthToken({ userUuid })

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
