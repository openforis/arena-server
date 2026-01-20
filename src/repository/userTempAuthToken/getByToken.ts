import { BaseProtocol, DB, DBs, SqlSelectBuilder, TableUserTempAuthToken } from '../../db'
import { UserTempAuthToken } from './insert'

/**
 * Retrieves a temporary auth token by its token UUID.
 *
 * @param token - Token UUID
 * @param client - Database client
 */
export const getByToken = async (token: string, client: BaseProtocol = DB): Promise<UserTempAuthToken | null> => {
  const table = new TableUserTempAuthToken()

  const sql = new SqlSelectBuilder()
    .select('*')
    .from(table)
    .where(`${table.token} = $/token/`, `${table.dateExpiresAt} > NOW()`)
    .build()

  return client.oneOrNone<UserTempAuthToken>(sql, { token }, (row) => DBs.transformCallback({ row }))
}
