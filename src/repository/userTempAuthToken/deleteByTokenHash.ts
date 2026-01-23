import { BaseProtocol, DB, DBs, SqlDeleteBuilder, TableUserTempAuthToken } from '../../db'
import { UserTempAuthToken } from '../../model'

/**
 * Deletes a temporary auth token by hashing the provided token and deleting the hash.
 *
 * @param tokenHash - Token UUID hash to delete
 * @param client - Database client
 * @return The deleted UserTempAuthToken or null if not found
 */
export const deleteByTokenHash = async (
  tokenHash: string,
  client: BaseProtocol = DB
): Promise<UserTempAuthToken | null> => {
  const table = new TableUserTempAuthToken()

  const values = { [table.tokenHash.columnName]: tokenHash }

  const sql = new SqlDeleteBuilder().deleteFrom(table).where(values).build()

  return client.oneOrNone(sql, values, (row) => DBs.transformCallback({ row }))
}
