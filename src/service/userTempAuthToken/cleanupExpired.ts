import { UserTempAuthTokenRepository } from '../../repository/userTempAuthToken'
import { BaseProtocol, DB } from '../../db'

/**
 * Cleans up expired temporary auth tokens.
 *
 * @param client - Database client
 */
export const cleanupExpired = async (client: BaseProtocol = DB): Promise<number> => {
  return UserTempAuthTokenRepository.deleteExpired(client)
}
