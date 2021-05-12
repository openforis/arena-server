import { Survey } from '@openforis/arena-core'
import { BaseProtocol, DB, DBs, SqlSelectBuilder, TableSurvey } from '../../db'

/**
 * Returns a list of surveys by name.
 *
 * @param options - Contains options for query
 * @param client - Database client.
 */

export const create = (options: { survey: Survey }, client: BaseProtocol = DB): Promise<Survey> => {
  // TODO
  //
  // export const insertSurvey = async ({ survey, props = {}, propsDraft = {} }, client = db) =>
  //   client.one(
  //     `
  //       INSERT INTO survey (uuid, props, props_draft, owner_uuid, published, draft, template )
  //       VALUES ($1, $2, $3, $4, $5, $6, $7)
  //       RETURNING ${surveySelectFields()}
  //     `,
  //     [
  //       Survey.getUuid(survey),
  //       props,
  //       propsDraft,
  //       survey.ownerUuid,
  //       Survey.isPublished(survey),
  //       Survey.isDraft(survey),
  //       Survey.isTemplate(survey),
  //     ],
  //     (def) => DB.transformCallback(def, true)
  //   )
}
