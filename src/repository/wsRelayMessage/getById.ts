import { BaseProtocol, DB, SqlSelectBuilder, TableWsRelayMessage } from '../../db'

/**
 * Retrieves a relay message's payload by ID.
 *
 * @param id - Relay message ID
 * @param client - Database client
 */
export const getById = async (id: string, client: BaseProtocol = DB): Promise<unknown> => {
  const table = new TableWsRelayMessage()

  const sql = new SqlSelectBuilder().select(table.payload).from(table).where(`${table.id} = $/id/`).build()

  const row = await client.oneOrNone<{ payload: unknown }>(sql, { id })
  return row?.payload ?? null
}
