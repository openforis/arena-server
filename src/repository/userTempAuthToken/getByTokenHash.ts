import { BaseProtocol, DB, DBs, SqlSelectBuilder, TableUserTempAuthToken } from '../../db'
import { UserTempAuthToken } from '../../model'

/**
 * Retrieves a temporary auth token by hashing the provided token and looking up the hash.
 *
 * @param tokenHash - Token UUID (plain text)
 * @param client - Database client
 */
export const getByTokenHash = async (
  tokenHash: string,
  client: BaseProtocol = DB
): Promise<UserTempAuthToken | null> => {
  const table = new TableUserTempAuthToken()

  const sql = new SqlSelectBuilder()
    .select('*')
    .from(table)
    .where(`${table.tokenHash} = $/tokenHash/`, `${table.dateExpiresAt} > NOW()`)
    .build()

  return client.oneOrNone<UserTempAuthToken>(sql, { tokenHash }, (row) => DBs.transformCallback({ row }))
}
