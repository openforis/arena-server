import { DB, SqlSelectBuilder, TableChain } from '../../db'

export const count = (options: { surveyId: number }, client = DB): Promise<number> => {
  const { surveyId } = options

  const table = new TableChain(surveyId)
  const sql = new SqlSelectBuilder().select(`count(${table.alias}.*)`).from(table).build()

  return client.one<number>(sql, [], (res) => res.count)
}
