import { BaseProtocol, DB, SqlInsertBuilder, TableWsRelayMessage } from '../../db'

/**
 * Inserts a relay message and returns its ID.
 * Used to spill oversized cluster bus payloads out of the 8000-byte NOTIFY limit.
 *
 * @param payload - Arbitrary JSON payload
 * @param client - Database client
 */
export const insert = async (payload: unknown, client: BaseProtocol = DB): Promise<string> => {
  const table = new TableWsRelayMessage()

  const values = { [table.payload.columnName]: payload }

  const sql = new SqlInsertBuilder().insertInto(table).valuesByColumn(values).returning(table.id).build()

  const row = await client.one<{ id: string }>(sql, values)
  return row.id
}
