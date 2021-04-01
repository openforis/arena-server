import { TableSchemaSurveyRdb } from './tableSchemaSurveyRdb'

export abstract class TableResultSchemaSurveyRdb extends TableSchemaSurveyRdb {
  protected constructor(surveyId: number, name: string) {
    super(surveyId, `_res_${name}`)
  }
}
