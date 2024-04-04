import { DataQueryRepository } from '../../repository/dataQuery'

const { countAll, deleteQuerySummary: deleteQuery, getAll, getByUuid, insert, update } = DataQueryRepository

export const DataQueryService = {
  countAll,
  deleteQuery,
  getAll,
  getByUuid,
  insert,
  update,
}
