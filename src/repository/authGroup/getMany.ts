import { AuthGroup } from '@openforis/arena-core'
import { BaseProtocol, DB } from '../../db'
import { TableAuthGroup } from '../../db/table/schemaPublic/authGroup'
import { SqlSelectBuilder } from '../../db/sql/sqlSelectBuilder'
import { TableAuthGroupUser } from '../../db/table/schemaPublic/authGroupUser'

export const getMany = (options: { userUuid: string }, client: BaseProtocol = DB): Promise<AuthGroup[]> => {
  if (!('userUuid' in options)) throw new Error(`missingParams, ${options}`)
  const { userUuid } = options

  const tableAuthGroup = new TableAuthGroup()
  const tableAuthGroupUser = new TableAuthGroupUser()

  const sql = new SqlSelectBuilder()
    .select(
      tableAuthGroup.uuid,
      tableAuthGroup.surveyUuid,
      tableAuthGroup.name,
      tableAuthGroup.permissions,
      tableAuthGroup.record_steps
    )
    .from(tableAuthGroupUser)
    .join(tableAuthGroup)
    .on(`${tableAuthGroup.uuid} = ${tableAuthGroupUser.user_uuid}`)
    .where(`${tableAuthGroupUser.user_uuid} = $1`)
    .build()

  return client.many(sql, [userUuid] /*, dbTransformCallback */)
}
