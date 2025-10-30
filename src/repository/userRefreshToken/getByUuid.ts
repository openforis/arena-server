import { UserRefreshToken } from '@openforis/arena-core'

import { BaseProtocol, DB, DBs, SqlSelectBuilder, TableUserRefreshToken } from '../../db'

/**
 * Retrieves a refresh token by its token value.
 *
 * @param uuid - UUID of the refresh token
 * @param options - Optional search options
 * @param client - Database client
 */
export const getByUuid = async (
  uuid: string,
  options?: { includeRevoked?: boolean },
  client: BaseProtocol = DB
): Promise<UserRefreshToken | null> => {
  const { includeRevoked = false } = options ?? {}

  const table = new TableUserRefreshToken()

  const sql = new SqlSelectBuilder()
    .select('*')
    .from(table)
    .where(
      includeRevoked
        ? `${table.token} = $1`
        : `${table.uuid} = $1 AND ${table.revoked} = FALSE AND ${table.expiresAt} > NOW()`
    )
    .build()

  return client.oneOrNone<UserRefreshToken>(sql, [uuid], (row) => DBs.transformCallback({ row }))
}
