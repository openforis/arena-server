import { Column, ColumnType } from '../../column'
import { TableSchemaPublic } from './tableSchemaPublic'

export class TableAuthGroupUser extends TableSchemaPublic {
  readonly userUuid: Column = new Column(this, 'user_uuid', ColumnType.uuid)
  readonly groupUuid: Column = new Column(this, 'group_uuid', ColumnType.uuid)
  readonly props: Column = new Column(this, 'props', ColumnType.jsonb)

  constructor() {
    super('auth_group_user')
  }
}
