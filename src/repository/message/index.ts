export type { Message } from '../../model/message/types'
export { MessageStatus } from '../../model/message/types'
import { create } from './create'
import { deleteByUuid } from './delete'
import { count, getAll, getByUuid, getAllSent } from './read'
import { update } from './update'

export const MessageRepository = {
  create,
  deleteByUuid,
  count,
  getAll,
  getAllSent,
  getByUuid,
  update,
}
