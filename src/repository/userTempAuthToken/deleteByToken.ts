import { BaseProtocol, DB, SqlDeleteBuilder, TableUserTempAuthToken } from '../../db'

/**
 * Deletes a temporary auth token by its token UUID.
 *
 * @param token - Token UUID to delete
 * @param client - Database client
 */
export const deleteByToken = async (token: string, client: BaseProtocol = DB): Promise<number> => {
  const table = new TableUserTempAuthToken()

  const values = { [table.token.columnName]: token }

  const sql = new SqlDeleteBuilder().deleteFrom(table).where(values).build()

  const result = await client.result(sql, values)
  return result.rowCount
}
