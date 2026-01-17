import { BaseProtocol, DB, SqlDeleteBuilder, TableUserQrCodeAuth } from '../../db'

/**
 * Deletes a QR code auth token by its token UUID.
 *
 * @param token - Token UUID to delete
 * @param client - Database client
 */
export const deleteByToken = async (token: string, client: BaseProtocol = DB): Promise<number> => {
  const table = new TableUserQrCodeAuth()

  const values = { [table.token.columnName]: token }

  const sql = new SqlDeleteBuilder().deleteFrom(table).where(values).build()

  const result = await client.result(sql, values)
  return result.rowCount
}
