import { BaseProtocol, DB, DBs, SqlSelectBuilder, TableUserQrCodeAuth } from '../../db'
import { UserQrCodeAuth } from './insert'

/**
 * Retrieves QR code auth tokens for a user.
 *
 * @param userUuid - User UUID
 * @param options - Optional search options
 * @param client - Database client
 */
export const getByUserUuid = async (
  userUuid: string,
  options?: { includeExpired?: boolean },
  client: BaseProtocol = DB
): Promise<UserQrCodeAuth[]> => {
  const { includeExpired = false } = options ?? {}

  const table = new TableUserQrCodeAuth()

  const whereConditions = [`${table.userUuid} = $/userUuid/`]
  if (!includeExpired) {
    whereConditions.push(`${table.dateExpiresAt} > NOW()`)
  }

  const sql = new SqlSelectBuilder()
    .select('*')
    .from(table)
    .where(...whereConditions)
    .build()

  return client.map<UserQrCodeAuth>(sql, { userUuid }, (row) => DBs.transformCallback({ row }))
}
