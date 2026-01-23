import { Column, ColumnType } from '../../column'
import { TableSchemaPublic } from './tableSchemaPublic'

export class TableUserTempAuthToken extends TableSchemaPublic {
  readonly tokenHash: Column = new Column(this, 'token_hash', ColumnType.varchar)
  readonly userUuid: Column = new Column(this, 'user_uuid', ColumnType.uuid)
  readonly dateCreated: Column = new Column(this, 'date_created', ColumnType.timeStamp)
  readonly dateExpiresAt: Column = new Column(this, 'date_expires_at', ColumnType.timeStamp)

  constructor() {
    super('user_temp_auth_token')
  }

  get columns() {
    return [this.tokenHash, this.userUuid, this.dateCreated, this.dateExpiresAt]
  }
}
