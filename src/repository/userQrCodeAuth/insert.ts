import { BaseProtocol, DB, DBs, SqlInsertBuilder, TableUserQrCodeAuth } from '../../db'

export interface UserQrCodeAuth {
  token: string
  userUuid: string
  dateCreated: Date
  dateExpiresAt: Date
}

/**
 * Inserts a new QR code authentication token for a user.
 *
 * @param options - The QR code auth data
 * @param client - Database client
 */
export const insert = async (options: UserQrCodeAuth, client: BaseProtocol = DB): Promise<UserQrCodeAuth> => {
  const { token, userUuid, dateCreated, dateExpiresAt } = options

  const table = new TableUserQrCodeAuth()

  const values = {
    [table.token.columnName]: token,
    [table.userUuid.columnName]: userUuid,
    [table.dateCreated.columnName]: dateCreated,
    [table.dateExpiresAt.columnName]: dateExpiresAt,
  }

  const sql = new SqlInsertBuilder()
    .insertInto(table)
    .valuesByColumn(values)
    .returning(...table.columns)
    .build()

  return client.one<UserQrCodeAuth>(sql, values, (row) => DBs.transformCallback({ row }))
}
