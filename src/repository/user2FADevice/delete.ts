import { BaseProtocol, DB, SqlDeleteBuilder, TableUser2FADevice } from '../../db'

const deleteWhereCondition = async (values: Record<string, any>, client: BaseProtocol = DB): Promise<void> => {
  const table = new TableUser2FADevice()
  const sql = new SqlDeleteBuilder().deleteFrom(table).where(values).build()
  await client.none(sql, values)
}

/**
 * Deletes a 2FA device by its UUID.
 *
 * @param deviceUuid - The device UUID
 * @param client - Database client
 */
export const deleteByDeviceUuid = async (deviceUuid: string, client: BaseProtocol = DB): Promise<void> => {
  const table = new TableUser2FADevice()
  const values = { [table.uuid.columnName]: deviceUuid }
  await deleteWhereCondition(values, client)
}

/**
 * Deletes all 2FA devices for a user.
 *
 * @param userUuid - The user UUID
 * @param client - Database client
 */
export const deleteByUserUuid = async (userUuid: string, client: BaseProtocol = DB): Promise<void> => {
  const table = new TableUser2FADevice()
  const values = { [table.userUuid.columnName]: userUuid }
  await deleteWhereCondition(values, client)
}
