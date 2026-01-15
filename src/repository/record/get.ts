import { Record } from '@openforis/arena-core'

import { BaseProtocol, DB, DBs, SqlSelectBuilder, TableRecord, TableSurvey } from '../../db'
import { dbTransformCallback } from './transformCallback'

const buildRecordFetchSql = (surveyId: number, whereConditionBuilder: (tableRecord: TableRecord) => string): string => {
  const tableRecord = new TableRecord(surveyId)
  const tableSurvey = new TableSurvey()

  const whereCondition = whereConditionBuilder(tableRecord)

  const surveySql = new SqlSelectBuilder()
    .select(`${tableSurvey.uuid} AS survey_uuid`)
    .from(tableSurvey)
    .where(`${tableSurvey.id} = $/surveyId/`)
    .build()

  const recordSql = new SqlSelectBuilder()
    .select(
      tableRecord.uuid,
      tableRecord.ownerUuid,
      tableRecord.step,
      tableRecord.cycle,
      DBs.toChar(tableRecord.dateCreated),
      tableRecord.dateCreated,
      tableRecord.preview,
      tableRecord.validation,
      `(${surveySql})`
    )
    .from(tableRecord)
    .where(whereCondition)
    .build()
  return recordSql
}

export const get = async (
  options: {
    recordUuid: string
    surveyId: number
  },
  client: BaseProtocol = DB
): Promise<Record> => {
  if (!('recordUuid' in options) || !('surveyId' in options)) throw new Error(`missingParams, ${options}`)
  const { recordUuid, surveyId } = options
  const sql = buildRecordFetchSql(surveyId, (tableRecord: TableRecord) => `${tableRecord.uuid} = $/recordUuid/`)
  return client.one(sql, { surveyId, recordUuid }, (row) => dbTransformCallback({ surveyId, row }))
}

export const getManyByUuids = async (
  { uuids, surveyId }: { uuids: string[]; surveyId: number },
  client: BaseProtocol = DB
): Promise<Record[]> => {
  if (!uuids || !surveyId) throw new Error(`missingParams, ${uuids}, ${surveyId}`)
  if (uuids.length === 0) return []
  const sql = buildRecordFetchSql(surveyId, (tableRecord: TableRecord) => `${tableRecord.uuid} IN ($/uuids:csv/)`)
  return client.map(sql, { surveyId, uuids }, (row) => dbTransformCallback({ surveyId, row }))
}
