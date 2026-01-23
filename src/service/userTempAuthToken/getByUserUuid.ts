import { BaseProtocol, DB } from '../../db'
import { UserTempAuthTokenStored } from '../../model'
import { UserTempAuthTokenRepository } from '../../repository/userTempAuthToken'

/**
 * Retrieves all temporary auth tokens for a user.
 *
 * @param options - Options containing userUuid and whether to include expired tokens
 * @param client - Database client
 */
export const getByUserUuid = async (
  options: { userUuid: string; includeExpired?: boolean },
  client: BaseProtocol = DB
): Promise<UserTempAuthTokenStored[]> => {
  const { userUuid, includeExpired = false } = options
  return UserTempAuthTokenRepository.getByUserUuid(userUuid, { includeExpired }, client)
}
