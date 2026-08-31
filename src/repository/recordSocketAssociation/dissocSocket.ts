import { BaseProtocol, DB, SqlDeleteBuilder, TableRecordSocketAssociation } from '../../db'

/**
 * Removes a single record/socket association.
 *
 * @param params - Record UUID and socket ID
 * @param client - Database client
 */
export const dissocSocket = async (
  params: { recordUuid: string; socketId: string },
  client: BaseProtocol = DB
): Promise<void> => {
  const { recordUuid, socketId } = params
  const table = new TableRecordSocketAssociation()
  const values = {
    [table.recordUuid.columnName]: recordUuid,
    [table.socketId.columnName]: socketId,
  }
  const sql = new SqlDeleteBuilder().deleteFrom(table).where(values).build()
  await client.none(sql, values)
}
