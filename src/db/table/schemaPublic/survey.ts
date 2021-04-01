import { Column, ColumnType } from '../../column'
import { TableSchemaPublic } from './tableSchemaPublic'

export class TableSurvey extends TableSchemaPublic {
  readonly id: Column = new Column(this, 'id', ColumnType.bigint)
  readonly uuid: Column = new Column(this, 'uuid', ColumnType.uuid)
  readonly published: Column = new Column(this, 'published', ColumnType.boolean)
  readonly draft: Column = new Column(this, 'draft', ColumnType.boolean)
  readonly dateCreated: Column = new Column(this, 'date_created', ColumnType.timeStamp)
  readonly dateModified: Column = new Column(this, 'date_modified', ColumnType.timeStamp)
  readonly props: Column = new Column(this, 'props', ColumnType.jsonb)
  readonly propsDraft: Column = new Column(this, 'props_draft', ColumnType.jsonb)
  readonly meta: Column = new Column(this, 'meta', ColumnType.jsonb)
  readonly ownerUuid: Column = new Column(this, 'owner_uuid', ColumnType.uuid)

  constructor() {
    super('survey')
  }
}
