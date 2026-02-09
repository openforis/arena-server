import { deleteByDeviceUuid, deleteByUserUuid } from './delete'
import { getByDeviceUuid } from './getByDeviceUuid'
import { getByUserUuid } from './getByUserUuid'
import { countByUserUuid } from './countByUserUuid'
import { insert } from './insert'
import { update } from './update'

export const User2FADeviceRepository = {
  insert,
  getByUserUuid,
  getByDeviceUuid,
  countByUserUuid,
  update,
  deleteByDeviceUuid,
  deleteByUserUuid,
}
