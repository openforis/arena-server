import { BaseProtocol, DB, DBs, SqlSelectBuilder, TableUserQrCodeAuth } from '../../db'
import { UserQrCodeAuth } from './insert'

/**
 * Retrieves a QR code auth token by its token UUID.
 *
 * @param token - Token UUID
 * @param client - Database client
 */
export const getByToken = async (token: string, client: BaseProtocol = DB): Promise<UserQrCodeAuth | null> => {
  const table = new TableUserQrCodeAuth()

  const sql = new SqlSelectBuilder()
    .select('*')
    .from(table)
    .where(`${table.token} = $/token/`, `${table.dateExpiresAt} > NOW()`)
    .build()

  return client.oneOrNone<UserQrCodeAuth>(sql, { token }, (row) => DBs.transformCallback({ row }))
}
