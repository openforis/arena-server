import { BaseProtocol, DB, SqlSelectBuilder, TableSurvey } from '../../db'

/**
 * Returns a list of all survey ids.
 *
 * @param client - Database client.
 */
export const getAllIds = async (client: BaseProtocol = DB): Promise<Array<number>> => {
  const table = new TableSurvey()
  const sql = new SqlSelectBuilder().select(table.id).from(table).build()

  return client.map<number>(sql, [], ({ id }) => id)
}
