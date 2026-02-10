import { BaseProtocol, DB, DBs, SqlInsertBuilder, TableUser2FADevice } from '../../db'
import { User2FADevice } from '../../model'

/**
 * Inserts a new 2FA device for a user.
 *
 * @param options - The 2FA device data
 * @param client - Database client
 */
export const insert = async (
  options: Omit<User2FADevice, 'uuid' | 'dateCreated' | 'dateModified'> & { uuid?: string },
  client: BaseProtocol = DB
): Promise<User2FADevice> => {
  const { uuid, userUuid, deviceName, secret, enabled, backupCodes } = options

  const table = new TableUser2FADevice()
  const now = new Date()
  const values: Record<string, any> = {
    [table.userUuid.columnName]: userUuid,
    [table.deviceName.columnName]: deviceName,
    [table.secret.columnName]: secret,
    [table.enabled.columnName]: enabled,
    [table.backupCodes.columnName]: JSON.stringify(backupCodes),
    [table.dateCreated.columnName]: now,
    [table.dateModified.columnName]: now,
  }

  if (uuid) {
    values[table.uuid.columnName] = uuid
  }

  const sql = new SqlInsertBuilder()
    .insertInto(table)
    .valuesByColumn(values)
    .returning(...table.columns)
    .build()

  return client.one<User2FADevice>(sql, values, (row) => DBs.transformCallback({ row }))
}
