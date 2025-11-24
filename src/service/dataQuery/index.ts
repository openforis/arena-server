import { DataQuerySummary } from '@openforis/arena-core'

import { DataQueryRepository } from '../../repository/dataQuery'
import { SurveyItemService } from '../SurveyItemService'

const { count, deleteItem, getAll, getByUuid, insert, update } = DataQueryRepository

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface DataQueryService extends SurveyItemService<DataQuerySummary> {}

export const DataQueryServiceServer: DataQueryService = {
  count,
  getAll,
  getByUuid,
  insert,
  update,
  deleteItem,
}
