import { Column, ColumnType } from '../../column'
import { TableSchemaPublic } from './tableSchemaPublic'

export class TableConnectedSocket extends TableSchemaPublic {
  readonly socketId: Column = new Column(this, 'socket_id', ColumnType.varchar)
  readonly userUuid: Column = new Column(this, 'user_uuid', ColumnType.uuid)
  readonly connectedAt: Column = new Column(this, 'connected_at', ColumnType.timeStamp)
  readonly lastSeenAt: Column = new Column(this, 'last_seen_at', ColumnType.timeStamp)

  constructor() {
    super('connected_socket')
  }

  get columns() {
    return [this.socketId, this.userUuid, this.connectedAt, this.lastSeenAt]
  }
}
