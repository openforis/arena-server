import { BaseProtocol, DB, SqlUpdateBuilder, TableUserRefreshToken } from '../../db'

/**
 * Revokes all refresh tokens for a user.
 *
 * @param options - Search options, containing the user UUID
 * @param client - Database client
 */
export const revokeAll = async (options: { userUuid: string }, client: BaseProtocol = DB): Promise<void> => {
  const { userUuid } = options

  const table = new TableUserRefreshToken()

  const sql = new SqlUpdateBuilder().update(table).set(table.revoked, 'TRUE').where(`${table.userUuid} = $1`).build()

  await client.none(sql, [userUuid])
}
