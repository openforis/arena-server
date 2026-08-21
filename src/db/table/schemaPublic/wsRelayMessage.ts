import { Column, ColumnType } from '../../column'
import { TableSchemaPublic } from './tableSchemaPublic'

export class TableWsRelayMessage extends TableSchemaPublic {
  readonly id: Column = new Column(this, 'id', ColumnType.uuid)
  readonly payload: Column = new Column(this, 'payload', ColumnType.jsonb)
  readonly dateCreated: Column = new Column(this, 'date_created', ColumnType.timeStamp)

  constructor() {
    super('ws_relay_message')
  }

  get columns() {
    return [this.id, this.payload, this.dateCreated]
  }
}
