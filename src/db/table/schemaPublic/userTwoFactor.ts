import { Column, ColumnType } from '../../column'
import { TableSchemaPublic } from './tableSchemaPublic'

export class TableUserTwoFactorDevice extends TableSchemaPublic {
  readonly uuid: Column = new Column(this, 'uuid', ColumnType.uuid)
  readonly userUuid: Column = new Column(this, 'user_uuid', ColumnType.uuid)
  readonly deviceName: Column = new Column(this, 'device_name', ColumnType.varchar)
  readonly secret: Column = new Column(this, 'secret', ColumnType.varchar)
  readonly enabled: Column = new Column(this, 'enabled', ColumnType.boolean)
  readonly backupCodes: Column = new Column(this, 'backup_codes', ColumnType.jsonb)
  readonly dateCreated: Column = new Column(this, 'date_created', ColumnType.timeStamp)
  readonly dateUpdated: Column = new Column(this, 'date_updated', ColumnType.timeStamp)

  constructor() {
    super('user_two_factor_device')
  }

  get columns() {
    return [
      this.uuid,
      this.userUuid,
      this.deviceName,
      this.secret,
      this.enabled,
      this.backupCodes,
      this.dateCreated,
      this.dateUpdated,
    ]
  }
}
