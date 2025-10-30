import { deleteExpired } from './deleteExpired'
import { getByUuid } from './getByToken'
import { insert } from './insert'
import { revoke } from './revoke'
import { revokeAll } from './revokeAll'

export const UserRefreshTokenRepository = {
  insert,
  getByToken: getByUuid,
  revoke,
  revokeAll,
  deleteExpired,
}
