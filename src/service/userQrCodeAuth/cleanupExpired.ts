import { UserQrCodeAuthRepository } from '../../repository/userQrCodeAuth'
import { BaseProtocol, DB } from '../../db'

/**
 * Cleans up expired QR code auth tokens.
 *
 * @param client - Database client
 */
export const cleanupExpired = async (client: BaseProtocol = DB): Promise<number> => {
  return UserQrCodeAuthRepository.deleteExpired(client)
}
