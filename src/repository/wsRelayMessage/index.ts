import { deleteExpired } from './deleteExpired'
import { getById } from './getById'
import { insert } from './insert'

export const WsRelayMessageRepository = {
  insert,
  getById,
  deleteExpired,
}
