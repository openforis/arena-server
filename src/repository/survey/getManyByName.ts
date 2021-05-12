import { Survey } from '@openforis/arena-core'
import { BaseProtocol, DB, DBs, SqlSelectBuilder, TableSurvey } from '../../db'

/**
 * Returns a list of surveys by name.
 *
 * @param options - Contains options for query
 * @param client - Database client.
 */

export const getManyByName = (options: { surveyName: string }, client: BaseProtocol = DB): Promise<Survey[] | null> => {
  const { surveyName } = options

  const table = new TableSurvey()
  const sql = new SqlSelectBuilder()
    .select(
      table.id,
      table.uuid,
      table.published,
      table.draft,
      table.props,
      table.propsDraft,
      table.ownerUuid,
      // table.template
      table.dateCreated,
      table.dateModified
    )
    .from(table)
    .where(`${table.props} ->> 'name' = $1 OR ${table.propsDraft} ->> 'name' = $1`)
    .build()

  return client.map(sql, [surveyName], (def) => DBs.transformCallback(def))
}
