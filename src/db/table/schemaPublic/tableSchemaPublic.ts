import { Schemata } from '../../schemata'
import { Table } from '../table'

export abstract class TableSchemaPublic extends Table {
  protected constructor(tableName: string) {
    super(Schemata.PUBLIC, tableName)
  }
}
