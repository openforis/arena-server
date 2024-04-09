import { Objects } from '@openforis/arena-core'
import { SqlBuilder } from './sqlBuilder'
import { Table } from '../table'
import { Column } from '../column'

interface ValuesByColumn {
  [key: string]: any
}

export class SqlInsertBuilder extends SqlBuilder {
  private _table: Table | null = null
  private _valuesByColumn: ValuesByColumn = {}
  private _returning: Column[] = []

  insertInto(table: Table): this {
    this._table = table
    return this
  }

  valuesByColumn(valuesByColumn: ValuesByColumn): this {
    this._valuesByColumn = valuesByColumn
    return this
  }

  returning(...fields: Array<Column>): this {
    this._returning.push(...fields)
    return this
  }

  build(): string {
    if (Objects.isEmpty(this._table) || Objects.isEmpty(this._valuesByColumn))
      throw new Error(`missingParams, ${this._table}, ${this._valuesByColumn}`)

    const columnNames: string[] = []
    const valuesParams: string[] = []

    Object.keys(this._valuesByColumn).forEach((columnName) => {
      columnNames.push(columnName)
      valuesParams.push(`$/${columnName}/`)
    })

    const parts = [`INSERT INTO ${this._table}`, `(${columnNames.join(', ')})`, `VALUES (${valuesParams.join(', ')})`]

    if (!Objects.isEmpty(this._returning)) {
      parts.push(`RETURNING ${this._returning.join(', ')}`)
    }
    return parts.join(' ')
  }
}
