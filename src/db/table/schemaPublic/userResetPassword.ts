import { Column, ColumnType } from '../../column'
import { TableSchemaPublic } from './tableSchemaPublic'

export class TableUserResetPassword extends TableSchemaPublic {
  readonly uuid: Column = new Column(this, 'uuid', ColumnType.uuid)
  readonly userUuid: Column = new Column(this, 'user_uuid', ColumnType.uuid)
  readonly dateCreated: Column = new Column(this, 'date_created', ColumnType.timeStamp)

  constructor() {
    super('"user_reset_password"')
  }
}
