import { Column, ColumnType } from '../../column'
import { TableSchemaPublic } from './tableSchemaPublic'

export class TableUser extends TableSchemaPublic {
  readonly uuid: Column = new Column(this, 'uuid', ColumnType.uuid)
  readonly name: Column = new Column(this, 'name', ColumnType.varchar)
  readonly email: Column = new Column(this, 'email', ColumnType.varchar)
  readonly password: Column = new Column(this, 'password', ColumnType.varchar)
  readonly prefs: Column = new Column(this, 'prefs', ColumnType.jsonb)
  readonly profilePicture: Column = new Column(this, 'profile_picture', ColumnType.bytea)
  readonly status: Column = new Column(this, 'status', ColumnType.varchar)
  readonly props: Column = new Column(this, 'props', ColumnType.jsonb)

  constructor() {
    super('"user"')
  }
}
