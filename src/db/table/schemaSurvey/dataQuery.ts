import { TableSchemaSurvey } from './tableSchemaSurvey'
import { Column, ColumnType } from '../../column'

export class TableDataQuery extends TableSchemaSurvey {
  readonly id: Column = new Column(this, 'id', ColumnType.bigint)
  readonly uuid: Column = new Column(this, 'uuid', ColumnType.uuid)
  readonly props: Column = new Column(this, 'props', ColumnType.jsonb)
  readonly content: Column = new Column(this, 'content', ColumnType.jsonb)
  readonly dateCreated: Column = new Column(this, 'date_created', ColumnType.timeStamp)
  readonly dateModified: Column = new Column(this, 'date_modified', ColumnType.timeStamp)

  constructor(surveyId: number) {
    super(surveyId, 'data_query')
  }
}
