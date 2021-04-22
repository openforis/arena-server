import { Column, ColumnType } from '../../column'
import { TableSchemaPublic } from './tableSchemaPublic'

export class TableAuthGroup extends TableSchemaPublic {
  readonly uuid: Column = new Column(this, 'uuid', ColumnType.uuid)
  readonly surveyUuid: Column = new Column(this, 'survey_uuid', ColumnType.uuid)
  readonly name: Column = new Column(this, 'name', ColumnType.varchar)
  readonly permissions: Column = new Column(this, 'permissions', ColumnType.jsonb)
  readonly record_steps: Column = new Column(this, 'record_steps', ColumnType.jsonb)

  constructor() {
    super('auth_group')
  }
}
