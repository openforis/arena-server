import { Column, ColumnType } from '../../column'
import { TableSchemaPublic } from './tableSchemaPublic'

export class TableRateLimitHit extends TableSchemaPublic {
  readonly key: Column = new Column(this, 'key', ColumnType.varchar)
  readonly hits: Column = new Column(this, 'hits', ColumnType.integer)
  readonly resetAt: Column = new Column(this, 'reset_at', ColumnType.timeStamp)

  constructor() {
    super('rate_limit_hit')
  }

  get columns() {
    return [this.key, this.hits, this.resetAt]
  }
}
