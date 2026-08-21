import { BaseProtocol, DB, SqlDeleteBuilder, TableWsRelayMessage } from '../../db'

/**
 * Deletes relay messages older than the given TTL.
 *
 * @param ttlMs - Rows with date_created older than this many milliseconds are deleted
 * @param client - Database client
 */
export const deleteExpired = async (ttlMs: number, client: BaseProtocol = DB): Promise<number> => {
  const table = new TableWsRelayMessage()

  const sql = new SqlDeleteBuilder()
    .deleteFrom(table)
    .whereRaw(`${table.dateCreated} < (now() AT TIME ZONE 'UTC') - ($1 || ' milliseconds')::interval`)
    .build()

  const result = await client.result(sql, [ttlMs])
  return result.rowCount
}
