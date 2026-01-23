import { BaseProtocol, DB, DBs, SqlDeleteBuilder, TableUserTempAuthToken } from '../../db'
import { UserTempAuthTokenStored } from '../../model'

/**
 * Deletes a temporary auth token by its hash.
 *
 * @param tokenHash - Hash of the token to delete
 * @param client - Database client
 * @return The deleted UserTempAuthTokenStored or null if not found
 */
export const deleteByTokenHash = async (
  tokenHash: string,
  client: BaseProtocol = DB
): Promise<UserTempAuthTokenStored | null> => {
  const table = new TableUserTempAuthToken()

  const values = { [table.tokenHash.columnName]: tokenHash }

  const sql = new SqlDeleteBuilder()
    .deleteFrom(table)
    .where(values)
    .returning(...table.columns)
    .build()

  return client.oneOrNone(sql, values, (row) => DBs.transformCallback({ row }))
}
