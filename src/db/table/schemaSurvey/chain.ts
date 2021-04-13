import { TableSchemaSurvey } from './tableSchemaSurvey'
import { Column, ColumnType } from '../../column'

export class TableChain extends TableSchemaSurvey {
  readonly uuid: Column = new Column(this, 'uuid', ColumnType.uuid)
  readonly dateCreated: Column = new Column(this, 'date_created', ColumnType.timeStamp)
  readonly dateModified: Column = new Column(this, 'date_modified', ColumnType.timeStamp)
  readonly dateExecuted: Column = new Column(this, 'date_executed', ColumnType.timeStamp)
  readonly props: Column = new Column(this, 'props', ColumnType.jsonb)
  readonly validation: Column = new Column(this, 'validation', ColumnType.jsonb)
  readonly statusExec: Column = new Column(this, 'status_exec', ColumnType.varchar)
  readonly scriptCommon: Column = new Column(this, 'script_common', ColumnType.varchar)

  constructor(surveyId: number) {
    super(surveyId, 'chain')
  }
}
