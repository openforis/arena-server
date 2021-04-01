import { Schemata } from '../../schemata'
import { Table } from '../table'

export abstract class TableSchemaSurvey extends Table {
  readonly surveyId: number

  protected constructor(surveyId: number, name: string) {
    super(Schemata.getSchemaSurvey(surveyId), name)
    this.surveyId = surveyId
  }
}
