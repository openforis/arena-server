import { deleteByDeviceUuid, deleteByUserUuid } from './delete'
import { getByDeviceUuid } from './getByDeviceUuid'
import { getByUserUuid, getEnabledByUserUuid } from './getByUserUuid'
import { countByUserUuid } from './countByUserUuid'
import { markTimeStepUsed, replaceBackupCodes } from './consume'
import { insert } from './insert'
import { update } from './update'

export const User2FADeviceRepository = {
  insert,
  getByUserUuid,
  getByDeviceUuid,
  getEnabledByUserUuid,
  countByUserUuid,
  update,
  markTimeStepUsed,
  replaceBackupCodes,
  deleteByDeviceUuid,
  deleteByUserUuid,
}
