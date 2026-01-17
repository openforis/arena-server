import { BaseProtocol, DB, SqlDeleteBuilder, TableUserQrCodeAuth } from '../../db'

/**
 * Deletes all expired QR code auth tokens.
 *
 * @param client - Database client
 */
export const deleteExpired = async (client: BaseProtocol = DB): Promise<number> => {
  const table = new TableUserQrCodeAuth()

  const sql = new SqlDeleteBuilder().deleteFrom(table).whereRaw(`${table.dateExpiresAt} < NOW()`).build()

  const result = await client.result(sql)
  return result.rowCount
}
