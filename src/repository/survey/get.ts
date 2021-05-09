import { Survey } from '@openforis/arena-core'
import { BaseProtocol, DB, SqlSelectBuilder, TableSurvey } from '../../db'
import { DBs } from '../../db'

/**
 * Returns a survey by id.
 *
 * @param options
 * @param client - Database client.
 */
export const get = async (
  options: {
    surveyId: number
    draft?: boolean
    backup?: boolean
  },
  client: BaseProtocol = DB
): Promise<Survey> => {
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
      table.dateCreated,
      table.dateModified
    )
    .from(table)
    .where(`${table.id} = $1`)
    .build()

  const { draft, backup } = options

  return client.one<Survey>(sql, [options.surveyId], (row) =>
    DBs.transformCallback({ row, assocPublishedDraft: false, draft, backup })
  )
}
