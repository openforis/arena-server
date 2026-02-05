import { BaseProtocol, DB, DBs, SqlSelectBuilder, TableUserTwoFactorDevice } from '../../db'
import { UserTwoFactorDeviceStored } from '../../model'

/**
 * Gets all 2FA devices for a user.
 *
 * @param userUuid - The user UUID
 * @param client - Database client
 */
export const getByUserUuid = async (
  userUuid: string,
  client: BaseProtocol = DB
): Promise<UserTwoFactorDeviceStored[]> => {
  const table = new TableUserTwoFactorDevice()

  const sql = new SqlSelectBuilder()
    .select(...table.columns)
    .from(table)
    .where(`${table.userUuid} = $/userUuid/`)
    .build()

  return client.map(sql, { userUuid }, (row) => DBs.transformCallback({ row }))
}
