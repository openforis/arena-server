import { TableSchemaSurvey } from './tableSchemaSurvey'
import { Column, ColumnType } from '../../column'

export class TableChainNodeDef extends TableSchemaSurvey {
  readonly uuid: Column = new Column(this, 'uuid', ColumnType.uuid)
  readonly chainUuid: Column = new Column(this, 'chain_uuid', ColumnType.uuid)
  readonly nodeDefUuid: Column = new Column(this, 'node_def_uuid', ColumnType.uuid)
  readonly index: Column = new Column(this, 'index', ColumnType.integer)
  readonly props: Column = new Column(this, 'props', ColumnType.jsonb)
  readonly script: Column = new Column(this, 'script', ColumnType.varchar)

  constructor(surveyId: number) {
    super(surveyId, 'chain_node_def')
  }
}
