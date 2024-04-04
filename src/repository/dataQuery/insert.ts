import { BaseProtocol, DB, DBs, SqlInsertBuilder, TableDataQuery } from '../../db'
import { DataQuerySummary } from '../../model'

export const insert = (
  params: { surveyId: number; querySummary: DataQuerySummary },
  client: BaseProtocol = DB
): Promise<DataQuerySummary> => {
  const { surveyId, querySummary } = params
  if (!surveyId || !querySummary) throw new Error(`missingParams, ${params}`)

  const table = new TableDataQuery(surveyId)
  const { content, props, uuid } = querySummary

  const values = {
    [table.content.columnName]: content,
    [table.props.columnName]: props,
    [table.uuid.columnName]: uuid,
  }

  const sql = new SqlInsertBuilder()
    .insertInto(table)
    .valuesByColumn(values)
    .returning(...table.summaryColumns)
    .build()

  return client.one<DataQuerySummary>(sql, values, (row) => DBs.transformCallback({ row }))
}
