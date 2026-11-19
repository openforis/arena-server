import { ArenaUserGroup } from '@openforis/arena-core'
import { BaseProtocol, DB, DBs, SqlInsertBuilder, TableUserGroup } from '../../db'

export const insert = (
  params: { surveyUuid: string; item: Partial<ArenaUserGroup> },
  client: BaseProtocol = DB
): Promise<ArenaUserGroup> => {
  const { surveyUuid, item } = params
  if (!surveyUuid) throw new Error(`missingParams, ${JSON.stringify(params)}`)

  const table = new TableUserGroup()
  const values = {
    [table.surveyUuid.columnName]: surveyUuid,
    [table.props.columnName]: item.props ?? {},
  }

  const sql = new SqlInsertBuilder()
    .insertInto(table)
    .valuesByColumn(values)
    .returning(...table.summaryColumns)
    .build()

  return client.one<ArenaUserGroup>(sql, values, (row) => DBs.transformCallback({ row }))
}
