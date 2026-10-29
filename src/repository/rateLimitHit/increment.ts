import { BaseProtocol, DB, TableRateLimitHit } from '../../db'

/**
 * Counts one hit for the given key, starting a new window of `windowMs` if the current one has expired.
 *
 * @param params - Rate limit key and window length in milliseconds
 * @param client - Database client
 * @returns The hits counted in the current window and when it resets
 */
export const increment = async (
  params: { key: string; windowMs: number },
  client: BaseProtocol = DB
): Promise<{ totalHits: number; resetTime: Date }> => {
  const { key, windowMs } = params
  const table = new TableRateLimitHit()
  const tableName = table.tableName
  const now = `(now() AT TIME ZONE 'UTC')`
  const expired = `${tableName}.${table.resetAt.columnName} <= ${now}`

  const sql = `
    INSERT INTO ${table.nameQualified} (${table.key.columnName}, ${table.hits.columnName}, ${table.resetAt.columnName})
    VALUES ($1, 1, ${now} + ($2 || ' milliseconds')::interval)
    ON CONFLICT (${table.key.columnName}) DO UPDATE SET
      ${table.hits.columnName} = CASE WHEN ${expired} THEN 1 ELSE ${tableName}.${table.hits.columnName} + 1 END,
      ${table.resetAt.columnName} = CASE WHEN ${expired} THEN EXCLUDED.${table.resetAt.columnName} ELSE ${tableName}.${table.resetAt.columnName} END
    RETURNING ${table.hits.columnName} AS total_hits, ${table.resetAt.columnName} AS reset_time
  `
  const row = await client.one<{ total_hits: number; reset_time: Date }>(sql, [key, windowMs])
  return { totalHits: row.total_hits, resetTime: row.reset_time }
}
