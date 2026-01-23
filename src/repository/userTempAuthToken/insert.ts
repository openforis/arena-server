import { BaseProtocol, DB, DBs, SqlInsertBuilder, TableUserTempAuthToken } from '../../db'
import { UserTempAuthTokenStored } from '../../model'

/**
 * Inserts a new temporary authentication token for a user.
 *
 * @param options - The temp auth token data
 * @param client - Database client
 */
export const insert = async (
  options: UserTempAuthTokenStored,
  client: BaseProtocol = DB
): Promise<UserTempAuthTokenStored> => {
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

  return client.one<UserTempAuthTokenStored>(sql, values, (row) => DBs.transformCallback({ row }))
}
