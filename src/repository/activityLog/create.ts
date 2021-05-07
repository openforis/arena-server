import { User, ActivityLogType } from '@openforis/arena-core'
import { BaseProtocol, DB, SqlInsertBuilder, TableActivityLog } from '../../db'

export const create = async (
  options: {
    content: any
    surveyId: number
    system: boolean
    type: ActivityLogType
    user: User
  },
  client: BaseProtocol = DB
): Promise<null> => {
  const requiredFields = ['surveyId', 'system', 'type', 'user']
  requiredFields.forEach((field) => {
    if (!(field in options)) throw new Error(`missingParams, ${options}`)
  })

  const { user, surveyId, type, content = {}, system = false } = options

  const table = new TableActivityLog(surveyId)

  const sql = new SqlInsertBuilder()
    .insertInto(table, table.type, table.userUuid, table.content, table.system)
    .values('$1', '$2', '$3::jsonb', '$4')
    .build()

  return client.none(sql, [type, user.uuid, content, system])
}
