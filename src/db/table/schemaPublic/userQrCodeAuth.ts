import { Column, ColumnType } from '../../column'
import { TableSchemaPublic } from './tableSchemaPublic'

export class TableUserQrCodeAuth extends TableSchemaPublic {
  readonly token: Column = new Column(this, 'token', ColumnType.uuid)
  readonly userUuid: Column = new Column(this, 'user_uuid', ColumnType.uuid)
  readonly dateCreated: Column = new Column(this, 'date_created', ColumnType.timeStamp)
  readonly dateExpiresAt: Column = new Column(this, 'date_expires_at', ColumnType.timeStamp)

  constructor() {
    super('user_qr_code_auth')
  }

  get columns() {
    return [this.token, this.userUuid, this.dateCreated, this.dateExpiresAt]
  }
}
