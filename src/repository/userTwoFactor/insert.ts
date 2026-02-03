import { BaseProtocol, DB, DBs, SqlInsertBuilder, TableUserTwoFactor } from '../../db'
import { UserTwoFactorStored } from '../../model'

/**
 * Inserts a new 2FA configuration for a user.
 *
 * @param options - The 2FA data
 * @param client - Database client
 */
export const insert = async (options: UserTwoFactorStored, client: BaseProtocol = DB): Promise<UserTwoFactorStored> => {
  const { userUuid, secret, enabled, backupCodes, dateCreated, dateUpdated } = options

  const table = new TableUserTwoFactor()

  const values = {
    [table.userUuid.columnName]: userUuid,
    [table.secret.columnName]: secret,
    [table.enabled.columnName]: enabled,
    [table.backupCodes.columnName]: JSON.stringify(backupCodes),
    [table.dateCreated.columnName]: dateCreated,
    [table.dateUpdated.columnName]: dateUpdated,
  }

  const sql = new SqlInsertBuilder()
    .insertInto(table)
    .valuesByColumn(values)
    .returning(...table.columns)
    .build()

  return client.one<UserTwoFactorStored>(sql, values, (row) => DBs.transformCallback({ row }))
}
