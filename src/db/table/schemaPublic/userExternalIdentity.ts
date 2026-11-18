import { Column, ColumnType } from '../../column'
import { TableSchemaPublic } from './tableSchemaPublic'

export class TableUserExternalIdentity extends TableSchemaPublic {
  readonly id: Column = new Column(this, 'id', ColumnType.bigint)
  readonly userUuid: Column = new Column(this, 'user_uuid', ColumnType.uuid)
  readonly providerId: Column = new Column(this, 'provider_id', ColumnType.varchar)
  readonly issuer: Column = new Column(this, 'issuer', ColumnType.varchar)
  readonly subject: Column = new Column(this, 'subject', ColumnType.varchar)
  readonly email: Column = new Column(this, 'email', ColumnType.varchar)
  readonly dateCreated: Column = new Column(this, 'date_created', ColumnType.timeStamp)
  readonly dateLastUsed: Column = new Column(this, 'date_last_used', ColumnType.timeStamp)

  constructor() {
    super('user_external_identity')
  }
}
