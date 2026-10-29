import { BaseProtocol, DB, TableRateLimitHit } from '../../db'

/**
 * Removes one hit from the given key (used when a request should not be counted after all).
 *
 * @param key - Rate limit key
 * @param client - Database client
 */
export const decrement = async (key: string, client: BaseProtocol = DB): Promise<void> => {
  const table = new TableRateLimitHit()
  const hits = table.hits.columnName
  await client.none(
    `UPDATE ${table.nameQualified} SET ${hits} = GREATEST(${hits} - 1, 0) WHERE ${table.key.columnName} = $1`,
    [key]
  )
}
