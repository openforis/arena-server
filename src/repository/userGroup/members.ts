import { Objects } from '@openforis/arena-core'
import {
  BaseProtocol,
  DB,
  SqlDeleteBuilder,
  SqlInsertBuilder,
  SqlJoinBuilder,
  SqlSelectBuilder,
  TableUser,
  TableUserGroupUser,
} from '../../db'

export interface UserGroupMember {
  uuid: string
  name: string
  email: string
}

export const addMember = (
  params: { groupUuid: string; userUuid: string },
  client: BaseProtocol = DB
): Promise<null> => {
  const { groupUuid, userUuid } = params
  const table = new TableUserGroupUser()
  const values = {
    [table.groupUuid.columnName]: groupUuid,
    [table.userUuid.columnName]: userUuid,
  }
  const sql = new SqlInsertBuilder().insertInto(table).valuesByColumn(values).build()
  return client.none(sql, values)
}

export const removeMember = (
  params: { groupUuid: string; userUuid: string },
  client: BaseProtocol = DB
): Promise<null> => {
  const { groupUuid, userUuid } = params
  const table = new TableUserGroupUser()
  const values = {
    [table.groupUuid.columnName]: groupUuid,
    [table.userUuid.columnName]: userUuid,
  }
  const sql = new SqlDeleteBuilder().deleteFrom(table).where(values).build()
  return client.none(sql, values)
}

export const getMembers = (params: { groupUuid: string }, client: BaseProtocol = DB): Promise<UserGroupMember[]> => {
  const { groupUuid } = params
  const tableUser = new TableUser()
  const tableUserGroupUser = new TableUserGroupUser()

  const joinClause = new SqlJoinBuilder().join(tableUser).on(`${tableUser.uuid} = ${tableUserGroupUser.userUuid}`)

  const sql = new SqlSelectBuilder()
    .select(tableUser.uuid, tableUser.name, tableUser.email)
    .from(tableUserGroupUser)
    .join(joinClause)
    .where(`${tableUserGroupUser.groupUuid} = $1`)
    .build()

  return client.map<UserGroupMember>(sql, [groupUuid], (row) => Objects.camelize(row, { limitToLevel: 1 }))
}
