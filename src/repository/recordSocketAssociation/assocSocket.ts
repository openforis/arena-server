import { BaseProtocol, DB, TableRecordSocketAssociation } from '../../db'

/**
 * Associates a socket with a record, cluster-wide, so a later mutation on any dyno can notify every socket
 * checked into the record.
 *
 * @param params - Record UUID and socket ID
 * @param client - Database client
 */
export const assocSocket = async (
  params: { recordUuid: string; socketId: string },
  client: BaseProtocol = DB
): Promise<void> => {
  const { recordUuid, socketId } = params
  const table = new TableRecordSocketAssociation()

  const sql = `
    INSERT INTO ${table.nameQualified}
      (${table.recordUuid.columnName}, ${table.socketId.columnName})
    VALUES
      ($1, $2)
    ON CONFLICT (${table.recordUuid.columnName}, ${table.socketId.columnName})
    DO NOTHING
  `
  await client.none(sql, [recordUuid, socketId])
}
