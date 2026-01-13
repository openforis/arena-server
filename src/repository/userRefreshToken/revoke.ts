import { BaseProtocol, DB, SqlUpdateBuilder, TableUserRefreshToken } from '../../db'

/**
 * Revokes a refresh token by its UUID.
 *
 * @param uuid - UUID of the refresh token to revoke
 * @param client - Database client
 */
export const revoke = async (uuid: string, client: BaseProtocol = DB): Promise<void> => {
  const table = new TableUserRefreshToken()

  const sql = new SqlUpdateBuilder().update(table).set(table.revoked, 'TRUE').where(`${table.uuid} = $1`).build()

  await client.none(sql, [uuid])
}
