import { Table } from '../table'
import { ColumnType } from './type'

export class Column {
  readonly name: string
  readonly table: Table
  readonly type: ColumnType

  constructor(table: Table, name: string, type: ColumnType) {
    this.table = table
    this.name = name
    this.type = type
  }

  toString(): string {
    return `${this.table.alias}.${this.name}`
  }
}
