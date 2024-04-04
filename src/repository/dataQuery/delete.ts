import { BaseProtocol, DB, DBs, TableDataQuery } from '../../db'
import { DataQuerySummary } from '../../model'
import { SqlDeleteBuilder } from '../../db/sql'

export const deleteQuerySummary = (
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
