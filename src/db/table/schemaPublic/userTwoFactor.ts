import { Column, ColumnType } from '../../column'
import { TableSchemaPublic } from './tableSchemaPublic'

export class TableUserTwoFactor extends TableSchemaPublic {
  readonly userUuid: Column = new Column(this, 'user_uuid', ColumnType.uuid)
  readonly secret: Column = new Column(this, 'secret', ColumnType.varchar)
  readonly enabled: Column = new Column(this, 'enabled', ColumnType.boolean)
  readonly backupCodes: Column = new Column(this, 'backup_codes', ColumnType.jsonb)
  readonly dateCreated: Column = new Column(this, 'date_created', ColumnType.timeStamp)
  readonly dateUpdated: Column = new Column(this, 'date_updated', ColumnType.timeStamp)

  constructor() {
    super('user_two_factor')
  }

  get columns() {
    return [this.userUuid, this.secret, this.enabled, this.backupCodes, this.dateCreated, this.dateUpdated]
  }
}
