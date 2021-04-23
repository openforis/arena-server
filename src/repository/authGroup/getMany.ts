import { AuthGroup, Objects } from '@openforis/arena-core'
import { BaseProtocol, DB } from '../../db'
import { TableAuthGroup } from '../../db/table/schemaPublic/authGroup'
import { SqlSelectBuilder } from '../../db/sql/sqlSelectBuilder'
import { TableAuthGroupUser } from '../../db/table/schemaPublic/authGroupUser'
import { SqlJoinBuilder } from '../../db/sql/sqlJoinBuilder'

export const getMany = (options: { userUuid: string }, client: BaseProtocol = DB): Promise<AuthGroup[]> => {
  if (!('userUuid' in options)) throw new Error(`missingParams, ${options}`)
  const { userUuid } = options

  const tableAuthGroup = new TableAuthGroup()
  const tableAuthGroupUser = new TableAuthGroupUser()

  const joinClause = new SqlJoinBuilder()
    .join(tableAuthGroup)
    .on(`${tableAuthGroup.uuid} = ${tableAuthGroupUser.userUuid}`)
    .build()

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

  return client.map(sql, [userUuid], (row) => Objects.camelize(row))
}
