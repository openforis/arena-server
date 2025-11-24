import { BaseProtocol, DB, SqlDeleteBuilder, TableUserRefreshToken } from '../../db'

/**
 * Deletes all expired or revoked refresh tokens.
 *
 * @param client - Database client
 */
export const deleteExpired = async (client: BaseProtocol = DB): Promise<number> => {
  const table = new TableUserRefreshToken()

  const sql = new SqlDeleteBuilder()
    .deleteFrom(table)
    .whereRaw(`${table.expiresAt.columnName} < NOW() OR ${table.revoked}`)
    .build()

  const result = await client.result(sql)
  return result.rowCount
}
