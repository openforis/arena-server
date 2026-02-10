import { BaseProtocol, DB, DBs, SqlSelectBuilder, TableUser2FADevice } from '../../db'
import { User2FADevice } from '../../model'

/**
 * Gets a 2FA device by its UUID.
 *
 * @param deviceUuid - The device UUID
 * @param userUuid - The user UUID (to ensure the device belongs to the user)
 * @param client - Database client
 */
export const getByDeviceUuid = async (
  options: {
    deviceUuid: string
    userUuid: string
  },
  client: BaseProtocol = DB
): Promise<User2FADevice | null> => {
  const { deviceUuid, userUuid } = options
  const table = new TableUser2FADevice()

  const sql = new SqlSelectBuilder()
    .select(...table.columns)
    .from(table)
    .where(`${table.uuid} = $/deviceUuid/`, `${table.userUuid} = $/userUuid/`)
    .build()

  return client.oneOrNone<User2FADevice>(sql, { deviceUuid, userUuid }, (row) => DBs.transformCallback({ row }))
}
