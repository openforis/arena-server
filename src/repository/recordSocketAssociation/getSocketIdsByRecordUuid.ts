import { BaseProtocol, DB, TableRecordSocketAssociation } from '../../db'

/**
 * Retrieves the socket IDs currently checked into a record, cluster-wide.
 *
 * @param recordUuid - Record UUID
 * @param client - Database client
 */
export const getSocketIdsByRecordUuid = async (recordUuid: string, client: BaseProtocol = DB): Promise<string[]> => {
  const table = new TableRecordSocketAssociation()
  const sql = `SELECT ${table.socketId.columnName} FROM ${table.nameQualified} WHERE ${table.recordUuid.columnName} = $1`
  const rows = await client.manyOrNone<{ socket_id: string }>(sql, [recordUuid])
  return rows.map((row) => row.socket_id)
}
