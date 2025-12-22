import { Column, ColumnType } from '../../column'
import { TableSchemaPublic } from './tableSchemaPublic'

export class TableMessage extends TableSchemaPublic {
  readonly uuid: Column = new Column(this, 'uuid', ColumnType.uuid)
  readonly status: Column = new Column(this, 'status', ColumnType.varchar)
  readonly props: Column = new Column(this, 'props', ColumnType.jsonb)
  readonly createdByUserUuid: Column = new Column(this, 'created_by_user_uuid', ColumnType.uuid)
  readonly dateCreated: Column = new Column(this, 'date_created', ColumnType.timeStamp)
  readonly dateModified: Column = new Column(this, 'date_modified', ColumnType.timeStamp)

  constructor() {
    super('message')
  }
}
