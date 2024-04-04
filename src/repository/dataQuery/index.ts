import { insert } from './insert'
import { countAll, getAll, getByUuid } from './read'
import { update } from './update'
import { deleteQuerySummary } from './delete'

export const DataQueryRepository = {
  countAll,
  deleteQuerySummary,
  getByUuid,
  getAll,
  insert,
  update,
}
