import { BaseProtocol, DB, DBs, SqlSelectBuilder, TableUser2FADevice } from '../../db'
import { User2FADeviceStored } from '../../model'

/**
 * Gets all 2FA devices for a user.
 *
 * @param userUuid - The user UUID
 * @param client - Database client
 */
export const getByUserUuid = async (userUuid: string, client: BaseProtocol = DB): Promise<User2FADeviceStored[]> => {
  const table = new TableUser2FADevice()

  const sql = new SqlSelectBuilder()
    .select(...table.columns)
    .from(table)
    .where(`${table.userUuid} = $/userUuid/`)
    .build()

  return client.map(sql, { userUuid }, (row) => DBs.transformCallback({ row }))
}
