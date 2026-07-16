import { BaseProtocol, DB, DBs, SqlDeleteBuilder, TableUserGroup } from '../../db'
import { UserGroup } from './types'

export const deleteItem = (params: { uuid: string }, client: BaseProtocol = DB): Promise<UserGroup | null> => {
  const { uuid } = params
  const table = new TableUserGroup()
  const values = { [table.uuid.columnName]: uuid }

  const sql = new SqlDeleteBuilder()
    .deleteFrom(table)
    .where(values)
    .returning(...table.summaryColumns)
    .build()

  return client.oneOrNone<UserGroup>(sql, values, (row) => DBs.transformCallback({ row }))
}
