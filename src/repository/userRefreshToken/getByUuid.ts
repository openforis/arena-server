import { UserAuthRefreshToken } from '@openforis/arena-core'

import { BaseProtocol, DB, DBs, SqlSelectBuilder, TableUserRefreshToken } from '../../db'

/**
 * Retrieves a refresh token by its UUID.
 *
 * @param uuid - UUID of the refresh token
 * @param options - Optional search options
 * @param client - Database client
 */
export const getByUuid = async (
  uuid: string,
  options?: { includeRevoked?: boolean },
  client: BaseProtocol = DB
): Promise<UserAuthRefreshToken | null> => {
  const { includeRevoked = false } = options ?? {}

  const table = new TableUserRefreshToken()

  const sql = new SqlSelectBuilder()
    .select('*')
    .from(table)
    .where(
      includeRevoked
        ? `${table.uuid} = $/uuid/`
        : `${table.uuid} = $/uuid/ AND ${table.revoked} = FALSE AND ${table.expiresAt} > NOW()`
    )
    .build()

  return client.oneOrNone<UserAuthRefreshToken>(sql, { uuid }, (row) => DBs.transformCallback({ row }))
}
