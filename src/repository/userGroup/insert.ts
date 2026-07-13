import { BaseProtocol, DB, DBs, SqlInsertBuilder, TableUserGroup } from '../../db'
import { UserGroup } from './types'

export const insert = (
  params: { surveyUuid: string; item: Partial<UserGroup> },
  client: BaseProtocol = DB
): Promise<UserGroup> => {
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

  return client.one<UserGroup>(sql, values, (row) => DBs.transformCallback({ row }))
}
