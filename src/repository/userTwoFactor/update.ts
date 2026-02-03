import { BaseProtocol, DB, DBs, SqlUpdateBuilder, TableUserTwoFactor } from '../../db'
import { UserTwoFactorStored } from '../../model'

/**
 * Updates the 2FA configuration for a user.
 *
 * @param options - The 2FA data to update
 * @param client - Database client
 */
export const update = async (
  options: Partial<UserTwoFactorStored> & { userUuid: string },
  client: BaseProtocol = DB
): Promise<UserTwoFactorStored> => {
  const { userUuid, secret, enabled, backupCodes } = options

  const table = new TableUserTwoFactor()

  let updateBuilder = new SqlUpdateBuilder().update(table)
  let paramIndex = 1
  const values: any[] = []

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
    .where(`${table.userUuid} = $${paramIndex}`)
    .returning(...table.columns)
    .build()
  values.push(userUuid)

  return client.one<UserTwoFactorStored>(sql, values, (row) => DBs.transformCallback({ row }))
}
