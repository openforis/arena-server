import { UserTempAuthTokenRepository } from '../../repository/userTempAuthToken'
import { BaseProtocol, DB } from '../../db'

/**
 * Revokes (deletes) a temporary auth token.
 *
 * @param token - Token UUID to revoke
 * @param client - Database client
 */
export const revoke = async (token: string, client: BaseProtocol = DB): Promise<boolean> => {
  const deletedCount = await UserTempAuthTokenRepository.deleteByToken(token, client)
  return deletedCount > 0
}
