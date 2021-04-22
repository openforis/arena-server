import { Record } from '@openforis/arena-core'
import { BaseProtocol, DB } from '../../db'
import { TableRecord } from '../../db/table/schemaSurvey/record'
import { TableSurvey } from '../../db/table/schemaPublic/survey'
import { SqlSelectBuilder } from '../../db/sql/sqlSelectBuilder'
import { dbTransformCallback } from './transformCallback'

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
    .from(tableRecord)
    .where(`${tableRecord.uuid} = $1`)
    .build()

  return client.one(recordSql, [recordUuid, surveyId], (row) => dbTransformCallback({ surveyId, row }))
}
