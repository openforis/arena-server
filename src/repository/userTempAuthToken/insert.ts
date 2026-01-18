import { BaseProtocol, DB, DBs, SqlInsertBuilder, TableUserTempAuthToken } from '../../db'

export interface UserTempAuthToken {
  token: string
  userUuid: string
  dateCreated: Date
  dateExpiresAt: Date
}

/**
 * Inserts a new temporary authentication token for a user.
 *
 * @param options - The temp auth token data
 * @param client - Database client
 */
export const insert = async (options: UserTempAuthToken, client: BaseProtocol = DB): Promise<UserTempAuthToken> => {
  const { token, userUuid, dateCreated, dateExpiresAt } = options

  const table = new TableUserTempAuthToken()

  const values = {
    [table.token.columnName]: token,
    [table.userUuid.columnName]: userUuid,
    [table.dateCreated.columnName]: dateCreated,
    [table.dateExpiresAt.columnName]: dateExpiresAt,
  }

  const sql = new SqlInsertBuilder()
    .insertInto(table)
    .valuesByColumn(values)
    .returning(...table.columns)
    .build()

  return client.one<UserTempAuthToken>(sql, values, (row) => DBs.transformCallback({ row }))
}
