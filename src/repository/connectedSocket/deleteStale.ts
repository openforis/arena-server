import { BaseProtocol, DB, SqlDeleteBuilder, TableConnectedSocket } from '../../db'

/**
 * Deletes connected_socket rows whose heartbeat is older than the given TTL.
 * Prunes rows left behind by dynos that terminated without a clean disconnect (SIGKILL/OOM/crash).
 *
 * @param staleAfterMs - Rows with last_seen_at older than this many milliseconds are considered stale
 * @param client - Database client
 */
export const deleteStale = async (staleAfterMs: number, client: BaseProtocol = DB): Promise<number> => {
  const table = new TableConnectedSocket()

  const sql = new SqlDeleteBuilder()
    .deleteFrom(table)
    .whereRaw(`${table.lastSeenAt} < (now() AT TIME ZONE 'UTC') - ($1 || ' milliseconds')::interval`)
    .build()

  const result = await client.result(sql, [staleAfterMs])
  return result.rowCount
}
