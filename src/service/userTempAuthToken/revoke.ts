import { BaseProtocol, DB } from '../../db'
import { UserTempAuthTokenStored } from '../../model'
import { UserTempAuthTokenRepository } from '../../repository/userTempAuthToken'
import { hashToken } from './utils'

/**
 * Revokes (deletes) a temporary auth token.
 *
 * @param token - Token UUID to revoke
 * @param client - Database client
 * @returns The revoked UserTempAuthTokenStored or null if not found
 */
export const revoke = async (token: string, client: BaseProtocol = DB): Promise<UserTempAuthTokenStored | null> => {
  const tokenHash = hashToken(token)
  return UserTempAuthTokenRepository.deleteByTokenHash(tokenHash, client)
}
