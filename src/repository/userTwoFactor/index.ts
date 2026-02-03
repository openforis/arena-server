import { deleteByUserUuid } from './deleteByUserUuid'
import { getByUserUuid } from './getByUserUuid'
import { insert } from './insert'
import { update } from './update'

export const UserTwoFactorRepository = {
  insert,
  getByUserUuid,
  update,
  deleteByUserUuid,
}
