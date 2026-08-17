import { BaseProtocol, DB, SqlSelectBuilder, TableSurvey } from '../../db'

export type SurveyIdAppVersion = { id: number; appVersion: string | null }

/**
 * Returns the id and app_version of every survey.
 *
 * @param client - Database client.
 */
export const getAllIdsAndAppVersions = async (client: BaseProtocol = DB): Promise<Array<SurveyIdAppVersion>> => {
  const table = new TableSurvey()
  const sql = new SqlSelectBuilder().select(table.id, table.appVersion).from(table).build()

  return client.map<SurveyIdAppVersion>(sql, [], (row) => ({ id: row.id, appVersion: row.app_version }))
}
