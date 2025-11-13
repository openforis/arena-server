import { Column, ColumnType } from '../../column'
import { TableSchemaPublic } from './tableSchemaPublic'

export class TableInfo extends TableSchemaPublic {
  readonly keyName: Column = new Column(this, 'key_name', ColumnType.varchar)
  readonly keyValue: Column = new Column(this, 'key_value', ColumnType.varchar)
  readonly modifiedDate: Column = new Column(this, 'modified_date', ColumnType.timeStamp)

  constructor() {
    super('info')
  }
}
