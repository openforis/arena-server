import { BaseProtocol, DB, DBs, SqlSelectBuilder, TableUserTwoFactorDevice } from '../../db'
import { UserTwoFactorDeviceStored } from '../../model'

/**
 * Gets a 2FA device by its UUID.
 *
 * @param deviceUuid - The device UUID
 * @param client - Database client
 */
export const getByDeviceUuid = async (
  deviceUuid: string,
  client: BaseProtocol = DB
): Promise<UserTwoFactorDeviceStored | null> => {
  const table = new TableUserTwoFactorDevice()

  const sql = new SqlSelectBuilder()
    .select(...table.columns)
    .from(table)
    .where(`${table.uuid} = $/deviceUuid/`)
    .build()

  return client.oneOrNone<UserTwoFactorDeviceStored>(sql, { deviceUuid }, (row) => DBs.transformCallback({ row }))
}
