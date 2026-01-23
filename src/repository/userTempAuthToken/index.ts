import { deleteByTokenHash } from './deleteByTokenHash'
import { deleteExpired } from './deleteExpired'
import { getByTokenHash } from './getByTokenHash'
import { getByUserUuid } from './getByUserUuid'
import { insert } from './insert'

export const UserTempAuthTokenRepository = {
  insert,
  getByTokenHash,
  getByUserUuid,
  deleteByTokenHash,
  deleteExpired,
}
