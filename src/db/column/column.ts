import { Table } from '../table'
import { ColumnType } from './type'

export class Column {
  readonly columnName: string
  readonly table: Table
  readonly type: ColumnType

  constructor(table: Table, columnName: string, type: ColumnType) {
    this.table = table
    this.columnName = columnName
    this.type = type
  }

  getColumnName(): string {
    return this.columnName
  }

  toString(): string {
    return `${this.table.alias}.${this.columnName}`
  }
}
