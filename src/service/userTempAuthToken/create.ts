import { v4 as uuidv4 } from 'uuid'

import { BaseProtocol, DB } from '../../db'
import { UserTempAuthTokenForClient, UserTempAuthTokenStored } from '../../model'
import { UserTempAuthTokenRepository } from '../../repository/userTempAuthToken'
import { hashToken, toUserTempAuthTokenForClient } from './utils'

/**
 * Creates a new temporary authentication token for a user.
 * Returns the plain token for the client, but stores only the hash in the database.
 *
 * @param options - Options containing userUuid and optional expiration time
 * @param options.userUuid - User UUID
 * @param options.expirationMinutes - Expiration time in minutes (default: 1 minute)
 * @param client - Database client
 * @return The created temporary auth token with the plain token
 */
export const create = async (
  options: { userUuid: string; expirationMinutes?: number },
  client: BaseProtocol = DB
): Promise<UserTempAuthTokenForClient> => {
  const { userUuid, expirationMinutes = 1 } = options

  const now = new Date()
  const expiresAt = new Date(now.getTime() + expirationMinutes * 60 * 1000)

  const token = uuidv4()
  const tokenHash = hashToken(token)

  const tempAuthToken: UserTempAuthTokenStored = {
    tokenHash,
    userUuid,
    dateCreated: now,
    dateExpiresAt: expiresAt,
  }

  const inserted = await UserTempAuthTokenRepository.insert(tempAuthToken, client)

  return toUserTempAuthTokenForClient(inserted, token)
}
