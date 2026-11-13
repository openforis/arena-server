import { BaseProtocol, DB, TableRateLimitHit } from '../../db'

/**
 * Deletes the rows whose window has expired.
 *
 * @param client - Database client
 * @returns The number of deleted rows
 */
export const deleteExpired = async (client: BaseProtocol = DB): Promise<number> => {
  const table = new TableRateLimitHit()
  const result = await client.result(
    `DELETE FROM ${table.nameQualified} WHERE ${table.resetAt.columnName} <= (now() AT TIME ZONE 'UTC')`
  )
  return result.rowCount
}
