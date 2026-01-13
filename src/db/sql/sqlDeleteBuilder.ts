import { Objects } from '@openforis/arena-core'
import { SqlBuilder } from './sqlBuilder'
import { Table } from '../table'
import { Column } from '../column'

interface ValuesByColumn {
  [key: string]: any
}

export class SqlDeleteBuilder extends SqlBuilder {
  private _table: Table | null = null
  private _whereRaw: string | null = null
  private _whereValues: ValuesByColumn = {}
  private _returning: Column[] = []

  deleteFrom(table: Table): this {
    this._table = table
    return this
  }

  whereRaw(condition: string): this {
    this._whereRaw = condition
    return this
  }

  where(values: ValuesByColumn): this {
    this._whereValues = values
    return this
  }

  returning(...fields: Array<Column>): this {
    this._returning.push(...fields)
    return this
  }

  build(): string {
    if (Objects.isEmpty(this._table) || (Objects.isEmpty(this._whereValues) && Objects.isEmpty(this._whereRaw)))
      throw new Error(`missingParams, ${this._table}, ${this._whereValues}`)

    const whereCondition =
      this._whereRaw ??
      Object.keys(this._whereValues)
        .map((columnName) => `${columnName} = $/${columnName}/`)
        .join(' AND ')

    return `DELETE FROM ${this._table} WHERE ${whereCondition}`
  }
}
