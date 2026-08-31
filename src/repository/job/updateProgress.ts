import { BaseProtocol, DB, SqlUpdateBuilder, TableJob } from '../../db'

/**
 * Updates a job's processed/total counters, so polling from any dyno reflects current progress.
 *
 * @param params - Job UUID, processed items count and total items count
 * @param client - Database client
 */
export const updateProgress = async (
  params: { uuid: string; processed: number; total: number },
  client: BaseProtocol = DB
): Promise<void> => {
  const { uuid, processed, total } = params
  const table = new TableJob()

  const sql = new SqlUpdateBuilder()
    .update(table)
    .set(table.processed, '$/processed/')
    .set(table.total, '$/total/')
    .set(table.dateModified, `(now() AT TIME ZONE 'UTC')`)
    .where(`${table.uuid} = $/uuid/`)
    .build()

  await client.none(sql, { uuid, processed, total })
}
