import { BaseProtocol, DB, DBs, SqlInsertBuilder, TableUserTwoFactorDevice } from '../../db'
import { UserTwoFactorDeviceStored } from '../../model'

/**
 * Inserts a new 2FA device for a user.
 *
 * @param options - The 2FA device data
 * @param client - Database client
 */
export const insert = async (
  options: Omit<UserTwoFactorDeviceStored, 'uuid'> & { uuid?: string },
  client: BaseProtocol = DB
): Promise<UserTwoFactorDeviceStored> => {
  const { uuid, userUuid, deviceName, secret, enabled, backupCodes, dateCreated, dateUpdated } = options

  const table = new TableUserTwoFactorDevice()

  const values: Record<string, any> = {
    [table.userUuid.columnName]: userUuid,
    [table.deviceName.columnName]: deviceName,
    [table.secret.columnName]: secret,
    [table.enabled.columnName]: enabled,
    [table.backupCodes.columnName]: JSON.stringify(backupCodes),
    [table.dateCreated.columnName]: dateCreated,
    [table.dateUpdated.columnName]: dateUpdated,
  }

  if (uuid) {
    values[table.uuid.columnName] = uuid
  }

  const sql = new SqlInsertBuilder()
    .insertInto(table)
    .valuesByColumn(values)
    .returning(...table.columns)
    .build()

  return client.one<UserTwoFactorDeviceStored>(sql, values, (row) => DBs.transformCallback({ row }))
}
