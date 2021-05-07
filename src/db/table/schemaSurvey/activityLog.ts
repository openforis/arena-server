import { TableSchemaSurvey } from './tableSchemaSurvey'
import { Column, ColumnType } from '../../column'

export class TableActivityLog extends TableSchemaSurvey {
  readonly id: Column = new Column(this, 'id', ColumnType.integer)
  readonly type: Column = new Column(this, 'type', ColumnType.varchar)
  readonly userUuid: Column = new Column(this, 'user_uuid', ColumnType.uuid)
  readonly content: Column = new Column(this, 'content', ColumnType.jsonb)
  readonly system: Column = new Column(this, 'system', ColumnType.boolean)
  readonly dateCreated: Column = new Column(this, 'date_created', ColumnType.timeStamp)

  constructor(surveyId: number) {
    super(surveyId, 'activity_log')
  }
}
