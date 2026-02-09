import { BaseProtocol, DB, DBs, SqlSelectBuilder, TableUser2FADevice } from '../../db'
import { User2FADeviceStored } from '../../model'

/**
 * Gets a 2FA device by its UUID.
 *
 * @param deviceUuid - The device UUID
 * @param client - Database client
 */
export const getByDeviceUuid = async (
  deviceUuid: string,
  client: BaseProtocol = DB
): Promise<User2FADeviceStored | null> => {
  const table = new TableUser2FADevice()

  const sql = new SqlSelectBuilder()
    .select(...table.columns)
    .from(table)
    .where(`${table.uuid} = $/deviceUuid/`)
    .build()

  return client.oneOrNone<User2FADeviceStored>(sql, { deviceUuid }, (row) => DBs.transformCallback({ row }))
}
