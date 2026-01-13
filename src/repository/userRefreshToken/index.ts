import { deleteExpired } from './deleteExpired'
import { getByUuid } from './getByUuid'
import { insert } from './insert'
import { revoke } from './revoke'
import { revokeAll } from './revokeAll'

export const UserRefreshTokenRepository = {
  insert,
  getByUuid,
  revoke,
  revokeAll,
  deleteExpired,
}
