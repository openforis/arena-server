export type { Message } from '../../model/message/types'
export { MessageStatus } from '../../model/message/types'
import { create } from './create'
import { deleteByUuid } from './delete'
import { getAll, getByUuid, getAllSent } from './read'
import { update } from './update'

export const MessageRepository = {
  create,
  deleteByUuid,
  getAll,
  getAllSent,
  getByUuid,
  update,
}
