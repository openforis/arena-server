import { Column, ColumnType } from '../../column'
import { TableSchemaPublic } from './tableSchemaPublic'

export class TableRecordSocketAssociation extends TableSchemaPublic {
  readonly recordUuid: Column = new Column(this, 'record_uuid', ColumnType.uuid)
  readonly socketId: Column = new Column(this, 'socket_id', ColumnType.varchar)
  readonly dateCreated: Column = new Column(this, 'date_created', ColumnType.timeStamp)

  constructor() {
    super('record_socket_association')
  }

  get columns() {
    return [this.recordUuid, this.socketId, this.dateCreated]
  }
}
