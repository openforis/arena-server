import { BaseProtocol, DB, SqlDeleteBuilder, TableUserTwoFactorDevice } from '../../db'

/**
 * Deletes a 2FA device by its UUID.
 *
 * @param deviceUuid - The device UUID
 * @param client - Database client
 */
export const deleteByDeviceUuid = async (deviceUuid: string, client: BaseProtocol = DB): Promise<void> => {
  const table = new TableUserTwoFactorDevice()

  const values = { [table.uuid.columnName]: deviceUuid }

  const sql = new SqlDeleteBuilder().deleteFrom(table).where(values).build()

  await client.none(sql, values)
}

/**
 * Deletes all 2FA devices for a user.
 *
 * @param userUuid - The user UUID
 * @param client - Database client
 */
export const deleteByUserUuid = async (userUuid: string, client: BaseProtocol = DB): Promise<void> => {
  const table = new TableUserTwoFactorDevice()

  const values = { [table.userUuid.columnName]: userUuid }

  const sql = new SqlDeleteBuilder().deleteFrom(table).where(values).build()

  await client.none(sql, values)
}
