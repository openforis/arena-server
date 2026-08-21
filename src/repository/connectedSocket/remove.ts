import { BaseProtocol, DB, SqlDeleteBuilder, TableConnectedSocket } from '../../db'

/**
 * Deletes a connected_socket row by socket ID.
 *
 * @param socketId - Socket ID to remove
 * @param client - Database client
 */
export const remove = async (socketId: string, client: BaseProtocol = DB): Promise<void> => {
  const table = new TableConnectedSocket()
  const values = { [table.socketId.columnName]: socketId }
  const sql = new SqlDeleteBuilder().deleteFrom(table).where(values).build()
  await client.none(sql, values)
}
