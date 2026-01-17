import { UserQrCodeAuth, UserQrCodeAuthRepository } from '../../repository/userQrCodeAuth'
import { BaseProtocol, DB } from '../../db'

/**
 * Retrieves and validates a QR code auth token.
 * Returns the token if it exists and is not expired, null otherwise.
 *
 * @param token - Token UUID
 * @param client - Database client
 */
export const getByToken = async (token: string, client: BaseProtocol = DB): Promise<UserQrCodeAuth | null> => {
  return UserQrCodeAuthRepository.getByToken(token, client)
}
