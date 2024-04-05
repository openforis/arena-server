import { insert } from './insert'
import { count, getAll, getByUuid } from './read'
import { update } from './update'
import { deleteItem } from './delete'

export const DataQueryRepository = {
  count,
  deleteItem,
  getByUuid,
  getAll,
  insert,
  update,
}
