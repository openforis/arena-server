import { BaseProtocol, DB, DBs, SqlInsertBuilder, TableUserRefreshToken } from '../../db'

type InsertOptions = {
  userUuid: string
  token: string
  expiresAt: Date
  props?: Record<string, any>
}

type UserRefreshToken = {
  uuid: string
  user_uuid: string
  token: string
  props: Record<string, any>
  date_created: Date
  expires_at: Date
  revoked: boolean
}

/**
 * Inserts a new refresh token for a user.
 *
 * @param options - The refresh token data
 * @param client - Database client
 */
export const insert = async (options: InsertOptions, client: BaseProtocol = DB): Promise<UserRefreshToken> => {
  const { userUuid, token, expiresAt, props = {} } = options

  const table = new TableUserRefreshToken()

  const values = {
    [table.userUuid.columnName]: userUuid,
    [table.token.columnName]: token,
    [table.expiresAt.columnName]: expiresAt,
    [table.props.columnName]: props,
  }

  const sql = new SqlInsertBuilder()
    .insertInto(table)
    .valuesByColumn(values)
    .returning(table.uuid, table.userUuid, table.token, table.props, table.dateCreated, table.expiresAt, table.revoked)
    .build()

  return client.one<UserRefreshToken>(sql, values, (row) => DBs.transformCallback({ row }))
}
