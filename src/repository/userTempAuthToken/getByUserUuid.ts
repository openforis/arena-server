import { BaseProtocol, DB, DBs, SqlSelectBuilder, TableUserTempAuthToken } from '../../db'
import { UserTempAuthTokenStored } from '../../model'

/**
 * Retrieves temporary auth tokens for a user.
 *
 * @param userUuid - User UUID
 * @param options - Optional search options
 * @param client - Database client
 */
export const getByUserUuid = async (
  userUuid: string,
  options?: { includeExpired?: boolean },
  client: BaseProtocol = DB
): Promise<UserTempAuthTokenStored[]> => {
  const { includeExpired = false } = options ?? {}

  const table = new TableUserTempAuthToken()

  const whereConditions = [`${table.userUuid} = $/userUuid/`]
  if (!includeExpired) {
    whereConditions.push(`${table.dateExpiresAt} > NOW()`)
  }

  const sql = new SqlSelectBuilder()
    .select('*')
    .from(table)
    .where(...whereConditions)
    .build()

  return client.map(sql, { userUuid }, (row) => DBs.transformCallback({ row }))
}
