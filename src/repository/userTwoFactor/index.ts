import { deleteByDeviceUuid, deleteByUserUuid } from './deleteByUserUuid'
import { getByDeviceUuid } from './getByDeviceUuid'
import { getByUserUuid } from './getByUserUuid'
import { insert } from './insert'
import { update } from './update'

export const UserTwoFactorRepository = {
  insert,
  getByUserUuid,
  getByDeviceUuid,
  update,
  deleteByDeviceUuid,
  deleteByUserUuid,
}
