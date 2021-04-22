import { Column, ColumnType } from '../../column'
import { TableSchemaPublic } from './tableSchemaPublic'

export class TableAuthGroupUser extends TableSchemaPublic {
  readonly user_uuid: Column = new Column(this, 'user_uuid', ColumnType.uuid)
  readonly group_uuid: Column = new Column(this, 'group_uuid', ColumnType.uuid)

  constructor() {
    super('auth_group_user')
  }
}
