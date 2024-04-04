import { User } from '@openforis/arena-core'

import { BaseProtocol, DB, DBs, TableDataQuery } from '../../db'
import { SqlUpdateBuilder } from '../../db/sql'
import { DataQuerySummary } from '../../model'

/**
 * Updates query summary
 *
 * @param params
 * @param params.querySummary - query summary to update
 * @param client - Database client.
 */

export const update = async (
  params: { surveyId: number; querySummary: DataQuerySummary },
  client: BaseProtocol = DB
): Promise<User> => {
  const { surveyId, querySummary } = params

  const table = new TableDataQuery(surveyId)

  const sql = new SqlUpdateBuilder()
    .update(table)
    .set(table.props, `${table.props} || $1::jsonb`)
    .set(table.content, '$2::jsonb')
    .where(`${table.uuid} = $3`)
    .returning(...table.summaryColumns)
    .build()

  return client.one(sql, [querySummary.props, querySummary.content, querySummary.uuid], (row) =>
    DBs.transformCallback({ row })
  )
}
