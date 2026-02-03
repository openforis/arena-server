import { BaseProtocol, DB, SqlDeleteBuilder, TableUserTwoFactor } from '../../db'

/**
 * Deletes the 2FA configuration for a user.
 *
 * @param userUuid - The user UUID
 * @param client - Database client
 */
export const deleteByUserUuid = async (userUuid: string, client: BaseProtocol = DB): Promise<void> => {
  const table = new TableUserTwoFactor()

  const values = { [table.userUuid.columnName]: userUuid }

  const sql = new SqlDeleteBuilder().deleteFrom(table).where(values).build()

  await client.none(sql, values)
}
