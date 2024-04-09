import { DataQuerySummary } from '@openforis/arena-core'

import { BaseProtocol, DB, DBs, SqlInsertBuilder, TableDataQuery } from '../../db'

export const insert = (
  params: { surveyId: number; item: DataQuerySummary },
  client: BaseProtocol = DB
): Promise<DataQuerySummary> => {
  const { surveyId, item } = params
  if (!surveyId || !item) throw new Error(`missingParams, ${params}`)

  const table = new TableDataQuery(surveyId)
  const { content, props, uuid } = item

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
