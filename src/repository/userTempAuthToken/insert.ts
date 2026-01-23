import { BaseProtocol, DB, DBs, SqlInsertBuilder, TableUserTempAuthToken } from '../../db'
import { UserTempAuthToken } from '../../model'

/**
 * Inserts a new temporary authentication token for a user.
 *
 * @param options - The temp auth token data
 * @param client - Database client
 */
export const insert = async (options: UserTempAuthToken, client: BaseProtocol = DB): Promise<UserTempAuthToken> => {
  const { tokenHash, userUuid, dateCreated, dateExpiresAt } = options

  const table = new TableUserTempAuthToken()

  const values = {
    [table.tokenHash.columnName]: tokenHash,
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
