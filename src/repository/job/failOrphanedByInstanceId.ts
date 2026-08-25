import { JobStatus } from '@openforis/arena-core'

import { BaseProtocol, DB, SqlUpdateBuilder, TableJob } from '../../db'

const activeStatuses = [JobStatus.pending, JobStatus.running]

/**
 * Marks pending/running job rows owned by the given process instance as failed.
 * Meant to be called once at boot, before this process inserts any job of its own: at that point,
 * any pending/running row still tagged with this same instanceId can only have been left behind by
 * a previous incarnation of this process (a crash or restart) - there's no staleness window to wait
 * out, unlike the time-based reaper that also exists to cover a dyno that never comes back at all.
 *
 * @param instanceId - The current process' instance identifier (ProcessEnv.instanceId)
 * @param client - Database client
 */
export const failOrphanedByInstanceId = async (instanceId: string, client: BaseProtocol = DB): Promise<number> => {
  const table = new TableJob()

  const props = {
    errors: {
      generic: {
        error: {
          valid: false,
          errors: [
            {
              key: 'appErrors:generic',
              params: { text: 'Job orphaned by a restart of its owning process and marked failed on boot' },
            },
          ],
        },
      },
    },
  }

  const sql = new SqlUpdateBuilder()
    .update(table)
    .set(table.status, '$/status/')
    .set(table.props, `${table.props} || $/props/::jsonb`)
    .set(table.dateModified, `(now() AT TIME ZONE 'UTC')`)
    .where(`${table.instanceId} = $/instanceId/ AND ${table.status} IN ($/activeStatuses:csv/)`)
    .build()

  const result = await client.result(sql, { status: JobStatus.failed, props, instanceId, activeStatuses })
  return result.rowCount
}
