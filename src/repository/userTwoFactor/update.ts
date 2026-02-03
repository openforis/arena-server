import { BaseProtocol, DB, DBs, SqlUpdateBuilder, TableUserTwoFactorDevice } from '../../db'
import { UserTwoFactorDeviceStored } from '../../model'

/**
 * Updates a 2FA device.
 *
 * @param options - The 2FA device data to update
 * @param client - Database client
 */
export const update = async (
  options: Partial<UserTwoFactorDeviceStored> & { uuid: string },
  client: BaseProtocol = DB
): Promise<UserTwoFactorDeviceStored> => {
  const { uuid, deviceName, secret, enabled, backupCodes } = options

  const table = new TableUserTwoFactorDevice()

  const updateBuilder = new SqlUpdateBuilder().update(table)
  const valuesByColumn: Record<string, any> = {}

  if (deviceName !== undefined) {
    valuesByColumn[table.deviceName.columnName] = deviceName
  }
  if (secret !== undefined) {
    valuesByColumn[table.secret.columnName] = secret
  }
  if (enabled !== undefined) {
    valuesByColumn[table.enabled.columnName] = enabled
  }
  if (backupCodes !== undefined) {
    valuesByColumn[table.backupCodes.columnName] = JSON.stringify(backupCodes)
  }
  // Always update dateUpdated
  valuesByColumn[table.dateUpdated.columnName] = new Date()

  // UUID is used in WHERE clause
  valuesByColumn[table.uuid.columnName] = uuid

  const sql = updateBuilder
    .setByColumnValues(valuesByColumn)
    .where(`${table.uuid} = $/uuid/`)
    .returning(...table.columns)
    .build()

  return client.one<UserTwoFactorDeviceStored>(sql, valuesByColumn, (row) => DBs.transformCallback({ row }))
}
