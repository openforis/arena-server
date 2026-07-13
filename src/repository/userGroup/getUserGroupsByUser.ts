import { Objects } from '@openforis/arena-core'
import { BaseProtocol, DB, SqlJoinBuilder, SqlSelectBuilder, TableUserGroup, TableUserGroupUser } from '../../db'
import { UserGroup } from './types'

export const getManyByUser = (
  options: { userUuid: string; surveyUuid?: string },
  client: BaseProtocol = DB
): Promise<UserGroup[]> => {
  const { userUuid, surveyUuid } = options
  if (!userUuid) throw new Error(`missingParams, ${options}`)

  const tableUserGroup = new TableUserGroup()
  const tableUserGroupUser = new TableUserGroupUser()

  const joinClause = new SqlJoinBuilder()
    .join(tableUserGroup)
    .on(`${tableUserGroup.uuid} = ${tableUserGroupUser.groupUuid}`)

  const selectBuilder = new SqlSelectBuilder()
    .select(
      tableUserGroup.uuid,
      tableUserGroup.surveyUuid,
      tableUserGroup.props,
      tableUserGroup.dateCreated,
      tableUserGroup.dateModified
    )
    .from(tableUserGroupUser)
    .join(joinClause)
    .where(`${tableUserGroupUser.userUuid} = $1`)

  const params: Array<string> = [userUuid]

  if (surveyUuid) {
    selectBuilder.where(`${tableUserGroup.surveyUuid} = $2`)
    params.push(surveyUuid)
  }

  const sql = selectBuilder.build()

  return client.map<UserGroup>(sql, params, (row) => Objects.camelize(row, { limitToLevel: 1 }))
}
