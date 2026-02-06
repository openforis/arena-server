import { deleteByDeviceUuid, deleteByUserUuid } from './delete'
import { getByDeviceUuid } from './getByDeviceUuid'
import { getByUserUuid } from './getByUserUuid'
import { countByUserUuid } from './countByUserUuid'
import { insert } from './insert'
import { update } from './update'

export const UserTwoFactorRepository = {
  insert,
  getByUserUuid,
  getByDeviceUuid,
  countByUserUuid,
  update,
  deleteByDeviceUuid,
  deleteByUserUuid,
}
