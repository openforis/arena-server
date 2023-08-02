import { TableSchemaSurvey } from './tableSchemaSurvey'
import { Column, ColumnType } from '../../column'

export class TableRecord extends TableSchemaSurvey {
  readonly uuid: Column = new Column(this, 'uuid', ColumnType.uuid)
  readonly ownerUuid: Column = new Column(this, 'owner_uuid', ColumnType.uuid)
  readonly step: Column = new Column(this, 'step', ColumnType.varchar)
  readonly cycle: Column = new Column(this, 'cycle', ColumnType.varchar)
  readonly dateCreated: Column = new Column(this, 'date_created', ColumnType.timeStamp)
  readonly dateModified: Column = new Column(this, 'date_modified', ColumnType.timeStamp)
  readonly preview: Column = new Column(this, 'preview', ColumnType.boolean)
  readonly validation: Column = new Column(this, 'validation', ColumnType.jsonb)

  constructor(surveyId: number) {
    super(surveyId, 'record')
  }
}
