import { BaseProtocol, DB, DBs, SqlSelectBuilder, TableDataQuery } from '../../db'
import { DataQuerySummary } from '../../model'
import { SqlSelectCountBuilder } from '../../db/sql'

export const count = (params: { surveyId: number }, client: BaseProtocol = DB): Promise<number> => {
  const { surveyId } = params
  const table = new TableDataQuery(surveyId)
  const sql = new SqlSelectCountBuilder().selectCountFrom(table).build()
  return client.one(sql, {}, DBs.transformCallbackCount)
}

export const getAll = (params: { surveyId: number }, client: BaseProtocol = DB): Promise<DataQuerySummary[]> => {
  const { surveyId } = params
  if (!surveyId) throw new Error(`missingParams, ${params}`)

  const table = new TableDataQuery(surveyId)

  const sql = new SqlSelectBuilder()
    .select(table.id, table.uuid, table.props, table.dateCreated, table.dateModified)
    .from(table)
    .build()

  return client.map<DataQuerySummary>(sql, [surveyId], (row) => DBs.transformCallback({ row }))
}

/**
 * Returns a query by uuid.
 *
 * @param params
 * @param client - Database client.
 */
export const getByUuid = async (
  params: {
    surveyId: number
    uuid: string
  },
  client: BaseProtocol = DB
): Promise<DataQuerySummary> => {
  const { surveyId, uuid } = params

  const table = new TableDataQuery(surveyId)
  const sql = new SqlSelectBuilder()
    .select(table.id, table.uuid, table.props, table.content, table.dateCreated, table.dateModified)
    .from(table)
    .where(`${table.uuid} = $1`)
    .build()

  return client.one<DataQuerySummary>(sql, [uuid], (row) => DBs.transformCallback({ row }))
}
