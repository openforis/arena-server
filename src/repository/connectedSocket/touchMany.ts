import { BaseProtocol, DB, TableConnectedSocket } from '../../db'

/**
 * Refreshes last_seen_at for the given socket IDs (heartbeat).
 *
 * @param socketIds - Socket IDs to touch
 * @param client - Database client
 */
export const touchMany = async (socketIds: string[], client: BaseProtocol = DB): Promise<void> => {
  if (socketIds.length === 0) return

  const table = new TableConnectedSocket()
  const sql = `UPDATE ${table.nameQualified} SET ${table.lastSeenAt.columnName} = (now() AT TIME ZONE 'UTC') WHERE ${table.socketId.columnName} = ANY($1)`
  await client.none(sql, [socketIds])
}
