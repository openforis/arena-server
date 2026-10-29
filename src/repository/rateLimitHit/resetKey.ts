import { BaseProtocol, DB, TableRateLimitHit } from '../../db'

/**
 * Clears the hits of the given key.
 *
 * @param key - Rate limit key
 * @param client - Database client
 */
export const resetKey = async (key: string, client: BaseProtocol = DB): Promise<void> => {
  const table = new TableRateLimitHit()
  await client.none(`DELETE FROM ${table.nameQualified} WHERE ${table.key.columnName} = $1`, [key])
}
