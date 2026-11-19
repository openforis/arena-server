import { ArenaUserGroup } from '@openforis/arena-core'
import { BaseProtocol, DB, DBs, SqlSelectBuilder, TableUserGroup } from '../../db'
import { SqlSelectCountBuilder } from '../../db/sql'

export const count = (params: { surveyUuid: string }, client: BaseProtocol = DB): Promise<number> => {
  const { surveyUuid } = params
  const table = new TableUserGroup()
  const whereValues = { [table.surveyUuid.columnName]: surveyUuid }
  const sql = new SqlSelectCountBuilder().selectCountFrom(table).where(whereValues).build()
  return client.one(sql, whereValues, DBs.transformCallbackCount)
}

export const getAll = (params: { surveyUuid: string }, client: BaseProtocol = DB): Promise<ArenaUserGroup[]> => {
  const { surveyUuid } = params
  if (!surveyUuid) throw new Error(`missingParams, ${JSON.stringify(params)}`)

  const table = new TableUserGroup()
  const sql = new SqlSelectBuilder()
    .select(table.uuid, table.surveyUuid, table.props, table.dateCreated, table.dateModified)
    .from(table)
    .where(`${table.surveyUuid} = $1`)
    .build()

  return client.map<ArenaUserGroup>(sql, [surveyUuid], (row) => DBs.transformCallback({ row }))
}

export const getByUuid = (params: { uuid: string }, client: BaseProtocol = DB): Promise<ArenaUserGroup | null> => {
  const { uuid } = params
  const table = new TableUserGroup()
  const sql = new SqlSelectBuilder()
    .select(table.uuid, table.surveyUuid, table.props, table.dateCreated, table.dateModified)
    .from(table)
    .where(`${table.uuid} = $1`)
    .build()

  return client.oneOrNone<ArenaUserGroup>(sql, [uuid], (row) => DBs.transformCallback({ row }))
}
