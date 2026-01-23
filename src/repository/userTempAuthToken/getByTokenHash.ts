import { BaseProtocol, DB, DBs, SqlSelectBuilder, TableUserTempAuthToken } from '../../db'
import { UserTempAuthTokenStored } from '../../model'

/**
 * Retrieves a temporary auth token by looking up the provided token hash in the database.
 *
 * @param tokenHash - Hashed token value used to look up the temporary auth token
 * @param client - Database client
 * @returns The UserTempAuthToken if found and not expired, null otherwise
 */
export const getByTokenHash = async (
  tokenHash: string,
  client: BaseProtocol = DB
): Promise<UserTempAuthTokenStored | null> => {
  const table = new TableUserTempAuthToken()

  const sql = new SqlSelectBuilder()
    .select('*')
    .from(table)
    .where(`${table.tokenHash} = $/tokenHash/`, `${table.dateExpiresAt} > NOW()`)
    .build()

  return client.oneOrNone(sql, { tokenHash }, (row) => DBs.transformCallback({ row }))
}
