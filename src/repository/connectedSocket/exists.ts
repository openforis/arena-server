import { BaseProtocol, DB, SqlSelectBuilder, TableConnectedSocket } from '../../db'

/**
 * Checks cluster-wide whether a socket ID is currently connected (to any dyno).
 *
 * @param socketId - Socket ID to check
 * @param client - Database client
 */
export const exists = async (socketId: string, client: BaseProtocol = DB): Promise<boolean> => {
  const table = new TableConnectedSocket()

  const sql = new SqlSelectBuilder().select('1').from(table).where(`${table.socketId} = $/socketId/`).limit(1).build()

  const row = await client.oneOrNone(sql, { socketId })
  return row !== null
}
