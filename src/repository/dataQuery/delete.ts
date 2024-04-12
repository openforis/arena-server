import { DataQuerySummary } from '@openforis/arena-core'

import { BaseProtocol, DB, DBs, SqlDeleteBuilder, TableDataQuery } from '../../db'

export const deleteItem = (
  params: { surveyId: number; uuid: string },
  client: BaseProtocol = DB
): Promise<DataQuerySummary | null> => {
  const { surveyId, uuid } = params
  if (!surveyId || !uuid) throw new Error(`missingParams, ${params}`)

  const table = new TableDataQuery(surveyId)

  const values = {
    [table.uuid.columnName]: uuid,
  }

  const sql = new SqlDeleteBuilder()
    .deleteFrom(table)
    .where(values)
    .returning(...table.summaryColumns)
    .build()

  return client.oneOrNone<DataQuerySummary>(sql, values, (row) => DBs.transformCallback({ row }))
}
