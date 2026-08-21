import { JobStatus } from '@openforis/arena-core'

import { BaseProtocol, DB, SqlSelectBuilder, TableJob } from '../../db'
import { JobRow, transformCallbackSafe } from './utils'

const activeStatuses = [JobStatus.pending, JobStatus.running]

/**
 * Retrieves the active (pending or running) job for a survey, cluster-wide, or null if none.
 * Used to enforce "one job per survey" without relying on in-memory maps.
 *
 * @param surveyId - Survey ID
 * @param client - Database client
 */
export const getActiveBySurveyId = async (surveyId: number, client: BaseProtocol = DB): Promise<JobRow | null> => {
  const table = new TableJob()

  const sql = new SqlSelectBuilder()
    .select(...table.columns)
    .from(table)
    .where(`${table.surveyId} = $/surveyId/`, `${table.status} IN ($/activeStatuses:csv/)`)
    .orderBy(table.dateCreated)
    .limit(1)
    .build()

  const row = await client.oneOrNone(sql, { surveyId, activeStatuses })
  return transformCallbackSafe(row)
}
