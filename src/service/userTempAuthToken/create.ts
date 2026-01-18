import { v4 as uuidv4 } from 'uuid'

import { UserTempAuthToken, UserTempAuthTokenRepository } from '../../repository/userTempAuthToken'
import { BaseProtocol, DB } from '../../db'

/**
 * Creates a new temporary authentication token for a user.
 *
 * @param options - Options containing userUuid and optional expiration time
 * @param options.userUuid - User UUID
 * @param options.expirationMinutes - Expiration time in minutes (default: 5)
 * @param client - Database client
 */
export const create = async (
  options: { userUuid: string; expirationMinutes?: number },
  client: BaseProtocol = DB
): Promise<UserTempAuthToken> => {
  const { userUuid, expirationMinutes = 1 } = options

  const now = new Date()
  const expiresAt = new Date(now.getTime() + expirationMinutes * 60 * 1000)

  const tempAuthToken: UserTempAuthToken = {
    token: uuidv4(),
    userUuid,
    dateCreated: now,
    dateExpiresAt: expiresAt,
  }

  return UserTempAuthTokenRepository.insert(tempAuthToken, client)
}
