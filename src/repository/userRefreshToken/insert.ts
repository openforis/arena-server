import { UserAuthRefreshToken } from '@openforis/arena-core'
import { BaseProtocol, DB, DBs, SqlInsertBuilder, TableUserRefreshToken } from '../../db'

type InsertOptions = {
  userUuid: string
  token: string
  expiresAt: Date
  props?: Record<string, any>
}

/**
 * Inserts a new refresh token for a user.
 *
 * @param options - The refresh token data
 * @param client - Database client
 */
export const insert = async (options: InsertOptions, client: BaseProtocol = DB): Promise<UserAuthRefreshToken> => {
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
    .returning(...table.columns)
    .build()

  return client.one<UserAuthRefreshToken>(sql, values, (row) => DBs.transformCallback({ row }))
}
