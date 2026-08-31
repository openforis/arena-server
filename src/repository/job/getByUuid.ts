import { BaseProtocol, DB, SqlSelectBuilder, TableJob } from '../../db'
import { JobRow, transformCallbackSafe } from './utils'

/**
 * Retrieves a job by UUID. Used by GET /jobs/:jobUuid so polling works regardless of which dyno serves it.
 *
 * @param uuid - Job UUID
 * @param client - Database client
 */
export const getByUuid = async (uuid: string, client: BaseProtocol = DB): Promise<JobRow | null> => {
  const table = new TableJob()

  const sql = new SqlSelectBuilder()
    .select(...table.columns)
    .from(table)
    .where(`${table.uuid} = $/uuid/`)
    .build()

  const row = await client.oneOrNone(sql, { uuid })
  return transformCallbackSafe(row)
}
