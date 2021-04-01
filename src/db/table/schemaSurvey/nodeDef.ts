import { TableSchemaSurvey } from './tableSchemaSurvey'
import { Column, ColumnType } from '../../column'

export class TableNodeDef extends TableSchemaSurvey {
  readonly id: Column = new Column(this, 'id', ColumnType.bigint)
  readonly uuid: Column = new Column(this, 'uuid', ColumnType.uuid)
  readonly parentUuid: Column = new Column(this, 'parent_uuid', ColumnType.uuid)
  readonly type: Column = new Column(this, 'type', ColumnType.varchar)
  readonly deleted: Column = new Column(this, 'deleted', ColumnType.boolean)
  readonly analysis: Column = new Column(this, 'analysis', ColumnType.boolean)
  readonly virtual: Column = new Column(this, 'virtual', ColumnType.boolean)
  readonly props: Column = new Column(this, 'props', ColumnType.jsonb)
  readonly propsDraft: Column = new Column(this, 'props_draft', ColumnType.jsonb)
  readonly propsAdvanced: Column = new Column(this, 'props_advanced', ColumnType.jsonb)
  readonly propsAdvancedDraft: Column = new Column(this, 'props_advanced_draft', ColumnType.jsonb)
  readonly meta: Column = new Column(this, 'meta', ColumnType.jsonb)
  readonly dateCreated: Column = new Column(this, 'date_created', ColumnType.timeStamp)
  readonly dateModified: Column = new Column(this, 'date_modified', ColumnType.timeStamp)

  constructor(surveyId: number) {
    super(surveyId, 'node_def')
  }
}
