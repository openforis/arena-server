import { Schemata } from '../../schemata'
import { Table } from '../table'

export abstract class TableSchemaPublic extends Table {
  protected constructor(name: string) {
    super(Schemata.PUBLIC, name)
  }
}
