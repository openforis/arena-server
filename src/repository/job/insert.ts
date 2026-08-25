import { JobStatus } from '@openforis/arena-core'

import { BaseProtocol, DB, SqlInsertBuilder, TableJob } from '../../db'
import { ProcessEnv } from '../../processEnv'
import { JobRow, transformCallback } from './utils'

/**
 * Inserts a job row with 'pending' status.
 * Used to move "one job per user" / "one job per survey" enforcement from in-memory maps to the DB.
 * Stamps the row with this process' instanceId so a fresh boot of the same dyno can later recognize
 * (and fail) rows orphaned by its own previous incarnation - see failOrphanedByInstanceId.
 *
 * @param params - Job UUID, owning user, survey and job type
 * @param client - Database client
 */
export const insert = (
  params: { uuid: string; userUuid: string; surveyId?: number; type: string },
  client: BaseProtocol = DB
): Promise<JobRow> => {
  const { uuid, userUuid, surveyId = null, type } = params
  const table = new TableJob()

  const values = {
    [table.uuid.columnName]: uuid,
    [table.userUuid.columnName]: userUuid,
    [table.surveyId.columnName]: surveyId,
    [table.type.columnName]: type,
    [table.status.columnName]: JobStatus.pending,
    [table.instanceId.columnName]: ProcessEnv.instanceId,
  }

  const sql = new SqlInsertBuilder()
    .insertInto(table)
    .valuesByColumn(values)
    .returning(...table.columns)
    .build()

  return client.one(sql, values, transformCallback)
}
