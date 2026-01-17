import { cleanupExpired } from './cleanupExpired'
import { create } from './create'
import { getByToken } from './getByToken'
import { getByUserUuid } from './getByUserUuid'
import { revoke } from './revoke'

export const UserQrCodeAuthService = {
  create,
  getByToken,
  getByUserUuid,
  revoke,
  cleanupExpired,
}
