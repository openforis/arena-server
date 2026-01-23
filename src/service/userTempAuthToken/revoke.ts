import { UserTempAuthTokenRepository } from '../../repository/userTempAuthToken'
import { BaseProtocol, DB } from '../../db'
import { hashToken } from './utils'
import { UserTempAuthToken } from '../../model'

/**
 * Revokes (deletes) a temporary auth token.
 *
 * @param token - Token UUID to revoke
 * @param client - Database client
 * @returns The revoked UserTempAuthToken or null if not found
 */
export const revoke = async (token: string, client: BaseProtocol = DB): Promise<UserTempAuthToken | null> => {
  const tokenHash = hashToken(token)
  return UserTempAuthTokenRepository.deleteByTokenHash(tokenHash, client)
}
