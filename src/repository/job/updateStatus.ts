import { JobStatus } from '@openforis/arena-core'

import { BaseProtocol, DB, SqlUpdateBuilder, TableJob } from '../../db'
import { JobRow, transformCallback } from './utils'

/**
 * Updates a job's status, optionally merging extra summary data (result, errors, startTime, endTime, ...) into props.
 *
 * @param params - Job UUID, new status and optional props to merge
 * @param client - Database client
 */
export const updateStatus = (
  params: { uuid: string; status: JobStatus; props?: Record<string, unknown> },
  client: BaseProtocol = DB
): Promise<JobRow> => {
  const { uuid, status, props } = params
  const table = new TableJob()

  const builder = new SqlUpdateBuilder()
    .update(table)
    .set(table.status, '$/status/')
    .set(table.dateModified, `(now() AT TIME ZONE 'UTC')`)
    .where(`${table.uuid} = $/uuid/`)

  if (props !== undefined) {
    builder.set(table.props, `${table.props} || $/props/::jsonb`)
  }

  const sql = builder.returning(...table.columns).build()

  return client.one(sql, { uuid, status, props }, transformCallback)
}
