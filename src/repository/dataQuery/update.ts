import { DataQuerySummary } from '@openforis/arena-core'

import { BaseProtocol, DB, DBs, TableDataQuery } from '../../db'
import { SqlUpdateBuilder } from '../../db/sql'

export const update = async (
  params: { surveyId: number; item: DataQuerySummary },
  client: BaseProtocol = DB
): Promise<DataQuerySummary> => {
  const { surveyId, item } = params

  const table = new TableDataQuery(surveyId)

  const sql = new SqlUpdateBuilder()
    .update(table)
    .set(table.props, `${table.props} || $1::jsonb`)
    .set(table.content, '$2::jsonb')
    .where(`${table.uuid} = $3`)
    .returning(...table.summaryColumns)
    .build()

  return client.one(sql, [item.props, item.content, item.uuid], (row) => DBs.transformCallback({ row }))
}
