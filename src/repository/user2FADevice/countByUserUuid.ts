import { BaseProtocol, DB, SqlSelectBuilder, TableUser2FADevice } from '../../db'

/**
 * Counts the number of 2FA devices for a specific user.
 *
 * @param userUuid The UUID of the user whose 2FA devices are being counted
 * @param client Database client
 * @returns The count of 2FA devices for the user
 */
export const countByUserUuid = async (userUuid: string, client: BaseProtocol = DB): Promise<number> => {
  const table = new TableUser2FADevice()

  const sql = new SqlSelectBuilder()
    .select(`COUNT(*) AS count`)
    .from(table)
    .where(`${table.userUuid} = $/userUuid/`)
    .build()

  const result = await client.one(sql, { userUuid })
  return Number(result.count)
}
