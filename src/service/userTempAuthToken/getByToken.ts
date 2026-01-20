import { UserTempAuthToken, UserTempAuthTokenRepository } from '../../repository/userTempAuthToken'
import { BaseProtocol, DB } from '../../db'

/**
 * Retrieves and validates a temporary auth token.
 * Returns the token if it exists and is not expired, null otherwise.
 *
 * @param token - Token UUID
 * @param client - Database client
 */
export const getByToken = async (token: string, client: BaseProtocol = DB): Promise<UserTempAuthToken | null> => {
  return UserTempAuthTokenRepository.getByToken(token, client)
}
