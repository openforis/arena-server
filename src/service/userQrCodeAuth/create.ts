import { v4 as uuidv4 } from 'uuid'

import { UserQrCodeAuth, UserQrCodeAuthRepository } from '../../repository/userQrCodeAuth'
import { BaseProtocol, DB } from '../../db'

/**
 * Creates a new QR code authentication token for a user.
 *
 * @param options - Options containing userUuid and optional expiration time
 * @param options.userUuid - User UUID
 * @param options.expirationMinutes - Expiration time in minutes (default: 5)
 * @param client - Database client
 */
export const create = async (
  options: { userUuid: string; expirationMinutes?: number },
  client: BaseProtocol = DB
): Promise<UserQrCodeAuth> => {
  const { userUuid, expirationMinutes = 5 } = options

  const now = new Date()
  const expiresAt = new Date(now.getTime() + expirationMinutes * 60 * 1000)

  const qrCodeAuth: UserQrCodeAuth = {
    token: uuidv4(),
    userUuid,
    dateCreated: now,
    dateExpiresAt: expiresAt,
  }

  return UserQrCodeAuthRepository.insert(qrCodeAuth, client)
}
