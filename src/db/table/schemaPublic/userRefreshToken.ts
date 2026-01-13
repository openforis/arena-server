import { Column, ColumnType } from '../../column'
import { TableSchemaPublic } from './tableSchemaPublic'

export class TableUserRefreshToken extends TableSchemaPublic {
  readonly uuid: Column = new Column(this, 'uuid', ColumnType.uuid)
  readonly userUuid: Column = new Column(this, 'user_uuid', ColumnType.uuid)
  readonly props: Column = new Column(this, 'props', ColumnType.jsonb)
  readonly dateCreated: Column = new Column(this, 'date_created', ColumnType.timeStamp)
  readonly expiresAt: Column = new Column(this, 'expires_at', ColumnType.timeStamp)
  readonly revoked: Column = new Column(this, 'revoked', ColumnType.boolean)

  constructor() {
    super('user_refresh_token')
  }

  get columns() {
    return [this.uuid, this.userUuid, this.props, this.dateCreated, this.expiresAt, this.revoked]
  }
}
