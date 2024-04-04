import { Objects } from '@openforis/arena-core'
import { SqlBuilder } from './sqlBuilder'
import { Table } from '../table'
import { Column } from '../column'

interface ValuesByColumn {
  [key: string]: any
}

export class SqlDeleteBuilder extends SqlBuilder {
  private _table: Table | null = null
  private _whereValues: ValuesByColumn = {}
  private _returning: Column[] = []

  deleteFrom(table: Table): this {
    this._table = table
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
    if (Objects.isEmpty(this._table) || Objects.isEmpty(this._whereValues))
      throw new Error(`missingParams, ${this._table}, ${this._whereValues}`)

    const whereConditions = Object.keys(this._whereValues)
      .map((columnName) => `${columnName} = $/${columnName}/`)
      .join(' AND ')

    return `DELETE FROM ${this._table} WHERE ${whereConditions}`
  }
}
