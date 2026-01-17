import { UserQrCodeAuthRepository } from '../../repository/userQrCodeAuth'
import { BaseProtocol, DB } from '../../db'

/**
 * Revokes (deletes) a QR code auth token.
 *
 * @param token - Token UUID to revoke
 * @param client - Database client
 */
export const revoke = async (token: string, client: BaseProtocol = DB): Promise<boolean> => {
  const deletedCount = await UserQrCodeAuthRepository.deleteByToken(token, client)
  return deletedCount > 0
}
