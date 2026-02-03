import { BaseProtocol, DB, DBs, SqlSelectBuilder, TableUserTwoFactor } from '../../db'
import { UserTwoFactorStored } from '../../model'

/**
 * Gets the 2FA configuration for a user.
 *
 * @param userUuid - The user UUID
 * @param client - Database client
 */
export const getByUserUuid = async (
  userUuid: string,
  client: BaseProtocol = DB
): Promise<UserTwoFactorStored | null> => {
  const table = new TableUserTwoFactor()

  const sql = new SqlSelectBuilder()
    .select(...table.columns)
    .from(table)
    .where(`${table.userUuid} = $/userUuid/`)
    .build()

  return client.oneOrNone<UserTwoFactorStored>(sql, { userUuid }, (row) => DBs.transformCallback({ row }))
}
