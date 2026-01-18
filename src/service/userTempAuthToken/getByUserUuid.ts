import { UserTempAuthToken, UserTempAuthTokenRepository } from '../../repository/userTempAuthToken'
import { BaseProtocol, DB } from '../../db'

/**
 * Retrieves all temporary auth tokens for a user.
 *
 * @param options - Options containing userUuid and whether to include expired tokens
 * @param client - Database client
 */
export const getByUserUuid = async (
  options: { userUuid: string; includeExpired?: boolean },
  client: BaseProtocol = DB
): Promise<UserTempAuthToken[]> => {
  const { userUuid, includeExpired = false } = options
  return UserTempAuthTokenRepository.getByUserUuid(userUuid, { includeExpired }, client)
}
