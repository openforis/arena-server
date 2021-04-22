import { Record } from '@openforis/arena-core'
import { BaseProtocol, DB } from '../../db'
import { TableRecord } from '../../db/table/schemaSurvey/record'
import { TableSurvey } from '../../db/table/schemaPublic/survey'
import { SqlSelectBuilder } from '../../db/sql/sqlSelectBuilder'

// export const fetchRecordByUuid = async (surveyId, recordUuid, client = db) =>
//   client.oneOrNone(
//     `SELECT
//      ${recordSelectFields}, (SELECT s.uuid AS survey_uuid FROM survey s WHERE s.id = $2)
//      FROM ${getSurveyDBSchema(surveyId)}.record WHERE uuid = $1`,
//     [recordUuid, surveyId],
//     dbTransformCallback(surveyId)
//   )

export const get = async (
  options: {
    recordUuid: string
    surveyId: number
  },
  client: BaseProtocol = DB
): Promise<Record> => {
  if (!('recordUuid' in options) || !('surveyId' in options)) throw new Error(`missingParams, ${options}`)
  const { recordUuid, surveyId } = options
  const tableRecord = new TableRecord(surveyId)
  const tableSurvey = new TableSurvey()

  const surveySql = new SqlSelectBuilder()
    .select(`s.uuid AS survey_uuid`)
    .from(tableSurvey)
    .where(`${tableSurvey.id} = $2`)
    .build()

  const recordSql = new SqlSelectBuilder()
    .select(
      tableRecord.uuid,
      tableRecord.ownerUuid,
      tableRecord.step,
      tableRecord.cycle,
      `to_char(${tableRecord.dateCreated},'YYYY-MM-DD"T"HH24:MI:ssZ') as ${tableRecord.dateCreated}`,
      tableRecord.dateCreated,
      tableRecord.preview,
      tableRecord.validation,
      `(${surveySql})`
    )
    .from(tableSurvey)
    .where(`${tableSurvey.id} = $2`)
    .build()

  return client.one(recordSql, [recordUuid, surveyId] /*, dbTransformCallback(surveyId) */)
}
