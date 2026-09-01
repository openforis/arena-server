import { BaseProtocol, DB, TableConnectedSocket } from '../../db'

/**
 * Deletes connected_socket rows for the given socket IDs.
 * Used on graceful shutdown to remove this dyno's own presence rows.
 *
 * @param socketIds - Socket IDs to remove
 * @param client - Database client
 */
export const removeMany = async (socketIds: string[], client: BaseProtocol = DB): Promise<void> => {
  if (socketIds.length === 0) return

  const table = new TableConnectedSocket()
  const sql = `DELETE FROM ${table.nameQualified} WHERE ${table.socketId.columnName} = ANY($1)`
  await client.none(sql, [socketIds])
}
