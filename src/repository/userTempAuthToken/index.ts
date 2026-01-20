import { deleteByToken } from './deleteByToken'
import { deleteExpired } from './deleteExpired'
import { getByToken } from './getByToken'
import { getByUserUuid } from './getByUserUuid'
import { insert } from './insert'

export const UserTempAuthTokenRepository = {
  insert,
  getByToken,
  getByUserUuid,
  deleteByToken,
  deleteExpired,
}

export type { UserTempAuthToken } from './insert'
