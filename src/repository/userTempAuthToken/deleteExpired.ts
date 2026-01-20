import { BaseProtocol, DB, SqlDeleteBuilder, TableUserTempAuthToken } from '../../db'

/**
 * Deletes all expired temporary auth tokens.
 *
 * @param client - Database client
 */
export const deleteExpired = async (client: BaseProtocol = DB): Promise<number> => {
  const table = new TableUserTempAuthToken()

  const sql = new SqlDeleteBuilder().deleteFrom(table).whereRaw(`${table.dateExpiresAt} < NOW()`).build()

  const result = await client.result(sql)
  return result.rowCount
}
