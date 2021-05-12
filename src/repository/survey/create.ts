import { Survey } from '@openforis/arena-core'
import { BaseProtocol, DB, DBs, SqlInsertBuilder, TableSurvey } from '../../db'

/**
 * Returns a list of surveys by name.
 *
 * @param options - Contains options for query
 * @param client - Database client.
 */

export const create = async (
  options: { survey: Survey; propsDraft?: any; props?: any },
  client: BaseProtocol = DB
): Promise<Survey> => {
  const { survey, props = {}, propsDraft = {} } = options
  const table = new TableSurvey()
  const columns = [
    table.uuid,
    table.props,
    table.propsDraft,
    table.ownerUuid,
    table.published,
    table.draft,
    table.template,
  ]

  const sql = new SqlInsertBuilder()
    .insertInto(table, ...columns)
    .values('$1', '$2', '$3', '$4', '$5', '$6', '$7')
    .returning(...columns, table.dateCreated, table.dateCreated)
    .build()

  return client.one<Survey>(
    sql,
    [survey.uuid, props, propsDraft, survey.ownerUuid, survey.published, survey.draft, survey.template],
    (def) => DBs.transformCallback({ row: def, draft: true })
  )
}
