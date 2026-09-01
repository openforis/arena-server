import { deleteStale } from './deleteStale'
import { exists } from './exists'
import { remove } from './remove'
import { removeMany } from './removeMany'
import { touchMany } from './touchMany'
import { upsert } from './upsert'

export const ConnectedSocketRepository = {
  upsert,
  remove,
  removeMany,
  touchMany,
  exists,
  deleteStale,
}
