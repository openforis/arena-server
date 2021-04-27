import { TableUserResetPassword } from '../../db/table/schemaPublic/userResetPassword'
import { SqlSelectBuilder } from '../../db/sql/sqlSelectBuilder'
import { BaseProtocol, DB } from '../../db'

export const hasValidResetPassword = (options: { userUuid: string }, client: BaseProtocol = DB): Promise<boolean> => {
  if (!('userUuid' in options)) throw new Error(`missingParams, ${options}`)
  const { userUuid } = options
  const table = new TableUserResetPassword()

  const expiredCondition = `date_created < NOW() - INTERVAL '168 HOURS'`
  const sql = new SqlSelectBuilder()
    .select(`COUNT(*) > 0 as result`)
    .from(table)
    .where(`${table.userUuid} = $1 AND NOT ${expiredCondition}`)
    .build()

  return client.one<boolean>(sql, [userUuid], ({ result }) => result)
}
