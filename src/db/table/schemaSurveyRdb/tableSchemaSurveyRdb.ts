import { Table } from '../table'
import { Schemata } from '../../schemata'

export abstract class TableSchemaSurveyRdb extends Table {
  readonly surveyId: number

  protected constructor(surveyId: number, name: string) {
    super(Schemata.getSchemaSurveyRdb(surveyId), name)
    this.surveyId = surveyId
  }
}
