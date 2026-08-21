import { JobStatus } from '@openforis/arena-core'

import { BaseProtocol, DB, SqlSelectBuilder, TableJob } from '../../db'
import { JobRow, transformCallbackSafe } from './utils'

const activeStatuses = [JobStatus.pending, JobStatus.running]

/**
 * Retrieves the active (pending or running) job for a user, cluster-wide, or null if none.
 * Used to enforce "one job per user" without relying on in-memory maps.
 *
 * @param userUuid - Owning user UUID
 * @param client - Database client
 */
export const getActiveByUserUuid = async (userUuid: string, client: BaseProtocol = DB): Promise<JobRow | null> => {
  const table = new TableJob()

  const sql = new SqlSelectBuilder()
    .select(...table.columns)
    .from(table)
    .where(`${table.userUuid} = $/userUuid/`, `${table.status} IN ($/activeStatuses:csv/)`)
    .orderBy(table.dateCreated)
    .limit(1)
    .build()

  const row = await client.oneOrNone(sql, { userUuid, activeStatuses })
  return transformCallbackSafe(row)
}
