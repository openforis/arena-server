import { cleanupExpired } from './cleanupExpired'
import { create } from './create'
import { getByToken } from './getByTokenHash'
import { getByUserUuid } from './getByUserUuid'
import { revoke } from './revoke'

export type UserTempAuthTokenService = {
  create: typeof create
  getByToken: typeof getByToken
  getByUserUuid: typeof getByUserUuid
  revoke: typeof revoke
  cleanupExpired: typeof cleanupExpired
}

export const UserTempAuthTokenServiceServer: UserTempAuthTokenService = {
  create,
  getByToken: getByToken,
  getByUserUuid,
  revoke,
  cleanupExpired,
}
