import { Objects } from '@openforis/arena-core'
import { SqlBuilder } from './sqlBuilder'
import { Table } from '../table'

interface ValuesByColumn {
  [key: string]: any
}

export class SqlSelectCountBuilder extends SqlBuilder {
  private _table: Table | null = null
  private _whereValues: ValuesByColumn = {}

  selectCountFrom(table: Table): this {
    this._table = table
    return this
  }

  where(values: ValuesByColumn): this {
    this._whereValues = values
    return this
  }

  build(): string {
    if (Objects.isEmpty(this._table)) throw new Error(`missingParams, ${this._table}`)

    const whereConditions = Object.keys(this._whereValues)
      .map((columnName) => `${columnName} = $/${columnName}/`)
      .join(' AND ')

    const whereClause = whereConditions ? ` WHERE ${whereConditions}` : ''

    return `SELECT COUNT(*) FROM ${this._table}${whereClause}`
  }
}
