import { Column, ColumnType } from '../../column'
import { TableSchemaPublic } from './tableSchemaPublic'

export class TableJob extends TableSchemaPublic {
  readonly uuid: Column = new Column(this, 'uuid', ColumnType.uuid)
  readonly userUuid: Column = new Column(this, 'user_uuid', ColumnType.uuid)
  readonly surveyId: Column = new Column(this, 'survey_id', ColumnType.bigint)
  readonly type: Column = new Column(this, 'type', ColumnType.varchar)
  readonly status: Column = new Column(this, 'status', ColumnType.varchar)
  readonly processed: Column = new Column(this, 'processed', ColumnType.integer)
  readonly total: Column = new Column(this, 'total', ColumnType.integer)
  readonly props: Column = new Column(this, 'props', ColumnType.jsonb)
  readonly dateCreated: Column = new Column(this, 'date_created', ColumnType.timeStamp)
  readonly dateModified: Column = new Column(this, 'date_modified', ColumnType.timeStamp)
  readonly instanceId: Column = new Column(this, 'instance_id', ColumnType.varchar)

  constructor() {
    super('job')
  }

  get columns() {
    return [
      this.uuid,
      this.userUuid,
      this.surveyId,
      this.type,
      this.status,
      this.processed,
      this.total,
      this.props,
      this.dateCreated,
      this.dateModified,
      this.instanceId,
    ]
  }
}
