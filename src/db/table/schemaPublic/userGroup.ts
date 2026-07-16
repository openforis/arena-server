import { Column, ColumnType } from '../../column'
import { TableSchemaPublic } from './tableSchemaPublic'

export class TableUserGroup extends TableSchemaPublic {
  readonly uuid: Column = new Column(this, 'uuid', ColumnType.uuid)
  readonly surveyUuid: Column = new Column(this, 'survey_uuid', ColumnType.uuid)
  readonly props: Column = new Column(this, 'props', ColumnType.jsonb)
  readonly dateCreated: Column = new Column(this, 'date_created', ColumnType.timeStamp)
  readonly dateModified: Column = new Column(this, 'date_modified', ColumnType.timeStamp)

  constructor() {
    super('user_group')
  }

  get summaryColumns(): Column[] {
    return [this.uuid, this.surveyUuid, this.props, this.dateCreated, this.dateModified]
  }
}
