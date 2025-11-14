export type { InfoItem as Info } from './types'
import { getAll, getByKey } from './read'
import { upsert } from './upsert'
import { deleteItem } from './delete'

export const InfoRepository = {
  deleteItem,
  getAll,
  getByKey,
  upsert,
}
