import { Objects } from '@openforis/arena-core'
import { SqlBuilder } from './sqlBuilder'
import { Table } from '../table'
import { Column } from '../column'

export class SqlInsertBuilder extends SqlBuilder {
  private _table: Table | null = null
  private _columns: Column[] = []
  private _values: any[] = []
  private _returning: Column[] = []

  insertInto(table: Table, ...columns: Column[]): this {
    this._table = table
    this._columns.push(...columns)
    return this
  }

  values(...values: any[]): this {
    this._values.push(...values)
    return this
  }

  returning(...returning: Column[]): this {
    this._returning.push(...returning)
    return this
  }

  build(): string {
    if (Objects.isEmpty(this._table) || Objects.isEmpty(this._columns) || Objects.isEmpty(this._values))
      throw new Error(`missingParams, ${this._table}, ${this._columns},  ${this._values}`)
    if (this._columns.length !== this._values.length)
      throw new Error(`mismatchingParams, ${this._columns}, ${this._values}`)

    const parts: Array<string> = [
      `INSERT INTO ${this._table} (${this._columns.join(', ')})`,
      `VALUES (${this._values.join(', ')})`,
    ]

    if (!Objects.isEmpty(this._returning)) {
      parts.push(`RETURNING ${this._returning.join(', ')}`)
    }

    return parts.join(' ')
  }
}
