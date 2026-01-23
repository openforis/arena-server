import { BaseProtocol, DB } from '../../db'
import { UserTempAuthTokenStored } from '../../model'
import { UserTempAuthTokenRepository } from '../../repository/userTempAuthToken'
import { hashToken } from './utils'

/**
 * Retrieves and validates a temporary auth token.
 * Returns the token if it exists and is not expired, null otherwise.
 *
 * @param token - Token UUID
 * @param client - Database client
 */
export const getByToken = async (token: string, client: BaseProtocol = DB): Promise<UserTempAuthTokenStored | null> => {
  const tokenHash = hashToken(token)
  return UserTempAuthTokenRepository.getByTokenHash(tokenHash, client)
}
