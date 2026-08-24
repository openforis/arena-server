import { BaseProtocol, DB, TableRecordSocketAssociation } from '../../db'

/**
 * Removes every association for a socket. Also happens automatically via the connected_socket FK cascade
 * on disconnect; exposed directly for callers that need to dissociate without removing the presence row.
 *
 * @param socketId - Socket ID
 * @param client - Database client
 */
export const dissocSocketBySocketId = async (socketId: string, client: BaseProtocol = DB): Promise<void> => {
  const table = new TableRecordSocketAssociation()
  const sql = `DELETE FROM ${table.nameQualified} WHERE ${table.socketId.columnName} = $1`
  await client.none(sql, [socketId])
}
