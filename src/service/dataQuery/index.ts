import { DataQuerySummary } from '../../model'
import { DataQueryRepository } from '../../repository/dataQuery'
import { SurveyItemService } from '../SurveyItemService'

const { count, deleteItem, getAll, getByUuid, insert, update } = DataQueryRepository

export interface DataQueryService extends SurveyItemService<DataQuerySummary> {}

export const DataQueryServiceServer: DataQueryService = {
  count,
  getAll,
  getByUuid,
  insert,
  update,
  deleteItem,
}
