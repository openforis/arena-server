import { BaseProtocol, DB, DBs, SqlUpdateBuilder, TableUser2FADevice } from '../../db'
import { User2FADeviceStored } from '../../model'

/**
 * Updates a 2FA device.
 *
 * @param options - The 2FA device data to update
 * @param client - Database client
 */
export const update = async (
  options: Partial<User2FADeviceStored> & { uuid: string },
  client: BaseProtocol = DB
): Promise<User2FADeviceStored> => {
  const { uuid, deviceName, secret, enabled, backupCodes } = options

  const table = new TableUser2FADevice()

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
  // Always update dateModified
  valuesByColumn[table.dateModified.columnName] = new Date()

  // UUID is used in WHERE clause
  valuesByColumn[table.uuid.columnName] = uuid

  const sql = updateBuilder
    .setByColumnValues(valuesByColumn)
    .where(`${table.uuid} = $/uuid/`)
    .returning(...table.columns)
    .build()

  return client.one<User2FADeviceStored>(sql, valuesByColumn, (row) => DBs.transformCallback({ row }))
}
