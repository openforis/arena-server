import { BaseProtocol, DB, TableConnectedSocket } from '../../db'

/**
 * Inserts a connected_socket row, or refreshes it if the socket ID already exists.
 *
 * @param params - Socket ID and owning user UUID
 * @param client - Database client
 */
export const upsert = async (
  params: { socketId: string; userUuid: string },
  client: BaseProtocol = DB
): Promise<void> => {
  const { socketId, userUuid } = params
  const table = new TableConnectedSocket()

  const sql = `
    INSERT INTO ${table.nameQualified}
      (${table.socketId.columnName}, ${table.userUuid.columnName})
    VALUES
      ($1, $2)
    ON CONFLICT (${table.socketId.columnName})
    DO UPDATE SET
      ${table.userUuid.columnName} = EXCLUDED.${table.userUuid.columnName},
      ${table.lastSeenAt.columnName} = (now() AT TIME ZONE 'UTC')
  `
  await client.none(sql, [socketId, userUuid])
}
