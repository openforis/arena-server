import { AuthGroup, Objects } from '@openforis/arena-core'
import { BaseProtocol, DB, SqlJoinBuilder, SqlSelectBuilder, TableAuthGroup, TableAuthGroupUser } from '../../db'

export const getMany = (options: { userUuid: string }, client: BaseProtocol = DB): Promise<Array<AuthGroup>> => {
  if (!('userUuid' in options)) throw new Error(`missingParams, ${options}`)
  const { userUuid } = options

  const tableAuthGroup = new TableAuthGroup()
  const tableAuthGroupUser = new TableAuthGroupUser()

  const joinClause = new SqlJoinBuilder()
    .join(tableAuthGroup)
    .on(`${tableAuthGroup.uuid} = ${tableAuthGroupUser.groupUuid}`)

  const sql = new SqlSelectBuilder()
    .select(
      tableAuthGroup.uuid,
      tableAuthGroup.surveyUuid,
      tableAuthGroup.name,
      tableAuthGroup.permissions,
      tableAuthGroup.recordSteps
    )
    .from(tableAuthGroupUser)
    .join(joinClause)
    .where(`${tableAuthGroupUser.userUuid} = $1`)
    .build()

  return client.map<AuthGroup>(sql, [userUuid], (row) => Objects.camelize(row))
}
