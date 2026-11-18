import { Column, ColumnType } from '../../column'
import { TableSchemaPublic } from './tableSchemaPublic'

export class TableAuthProvider extends TableSchemaPublic {
  readonly id: Column = new Column(this, 'id', ColumnType.varchar)
  readonly type: Column = new Column(this, 'type', ColumnType.varchar)
  readonly props: Column = new Column(this, 'props', ColumnType.jsonb)
  readonly clientSecret: Column = new Column(this, 'client_secret', ColumnType.varchar)
  readonly iconFile: Column = new Column(this, 'icon_file', ColumnType.bytea)
  readonly iconMime: Column = new Column(this, 'icon_mime', ColumnType.varchar)
  readonly dateCreated: Column = new Column(this, 'date_created', ColumnType.timeStamp)
  readonly dateModified: Column = new Column(this, 'date_modified', ColumnType.timeStamp)

  constructor() {
    super('auth_provider')
  }
}
