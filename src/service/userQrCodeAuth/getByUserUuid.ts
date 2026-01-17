import { UserQrCodeAuth, UserQrCodeAuthRepository } from '../../repository/userQrCodeAuth'
import { BaseProtocol, DB } from '../../db'

/**
 * Retrieves all QR code auth tokens for a user.
 *
 * @param options - Options containing userUuid and whether to include expired tokens
 * @param client - Database client
 */
export const getByUserUuid = async (
  options: { userUuid: string; includeExpired?: boolean },
  client: BaseProtocol = DB
): Promise<UserQrCodeAuth[]> => {
  const { userUuid, includeExpired = false } = options
  return UserQrCodeAuthRepository.getByUserUuid(userUuid, { includeExpired }, client)
}
