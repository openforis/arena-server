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

  let updateBuilder = new SqlUpdateBuilder().update(table)
  let paramIndex = 1
  const values: any[] = []

  if (deviceName !== undefined) {
    updateBuilder = updateBuilder.set(table.deviceName, `$${paramIndex++}`)
    values.push(deviceName)
  }
  if (secret !== undefined) {
    updateBuilder = updateBuilder.set(table.secret, `$${paramIndex++}`)
    values.push(secret)
  }
  if (enabled !== undefined) {
    updateBuilder = updateBuilder.set(table.enabled, `$${paramIndex++}`)
    values.push(enabled)
  }
  if (backupCodes !== undefined) {
    updateBuilder = updateBuilder.set(table.backupCodes, `$${paramIndex++}::jsonb`)
    values.push(JSON.stringify(backupCodes))
  }

  // Always update dateUpdated
  updateBuilder = updateBuilder.set(table.dateUpdated, 'NOW()')

  const sql = updateBuilder
    .where(`${table.uuid} = $${paramIndex}`)
    .returning(...table.columns)
    .build()
  values.push(uuid)

  return client.one<UserTwoFactorDeviceStored>(sql, values, (row) => DBs.transformCallback({ row }))
}
