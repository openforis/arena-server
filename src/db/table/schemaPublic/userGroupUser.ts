import { Column, ColumnType } from '../../column'
import { TableSchemaPublic } from './tableSchemaPublic'

export class TableUserGroupUser extends TableSchemaPublic {
  readonly userUuid: Column = new Column(this, 'user_uuid', ColumnType.uuid)
  readonly groupUuid: Column = new Column(this, 'group_uuid', ColumnType.uuid)
  readonly props: Column = new Column(this, 'props', ColumnType.jsonb)
  readonly dateCreated: Column = new Column(this, 'date_created', ColumnType.timeStamp)
  readonly dateModified: Column = new Column(this, 'date_modified', ColumnType.timeStamp)

  constructor() {
    super('user_group_user')
  }

  get summaryColumns(): Column[] {
    return [this.userUuid, this.groupUuid, this.props, this.dateCreated, this.dateModified]
  }
}
