import { BaseProtocol, DB, DBs, TableUserGroup } from '../../db'
import { SqlUpdateBuilder } from '../../db/sql'
import { UserGroup } from './types'

const dateModifiedNow = "(now() AT TIME ZONE 'UTC')"

// Full props replace.
export const update = (
  params: { uuid: string; props: UserGroup['props'] },
  client: BaseProtocol = DB
): Promise<UserGroup> => {
  const { uuid, props } = params
  const table = new TableUserGroup()

  const sql = new SqlUpdateBuilder()
    .update(table)
    .set(table.props, '$1::jsonb')
    .set(table.dateModified, dateModifiedNow)
    .where(`${table.uuid} = $2`)
    .returning(...table.summaryColumns)
    .build()

  return client.one<UserGroup>(sql, [props, uuid], (row) => DBs.transformCallback({ row }))
}

// Partial props merge.
export const updateProps = (
  params: { uuid: string; props: Partial<UserGroup['props']> },
  client: BaseProtocol = DB
): Promise<UserGroup> => {
  const { uuid, props } = params
  const table = new TableUserGroup()

  const sql = new SqlUpdateBuilder()
    .update(table)
    .set(table.props, `${table.props} || $1::jsonb`)
    .set(table.dateModified, dateModifiedNow)
    .where(`${table.uuid} = $2`)
    .returning(...table.summaryColumns)
    .build()

  return client.one<UserGroup>(sql, [props, uuid], (row) => DBs.transformCallback({ row }))
}
