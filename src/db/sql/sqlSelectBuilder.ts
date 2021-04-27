import { Objects } from '@openforis/arena-core'

import { Column } from '../column'
import { Table } from '../table'
import { SqlBuilder } from './sqlBuilder'
import { SqlJoinBuilder } from './sqlJoinBuilder'

export class SqlSelectBuilder extends SqlBuilder {
  private _select: Array<Column | string> = []
  private _from: Array<Table> = []
  private _join: Array<SqlJoinBuilder> = []
  private _where: Array<string> = []
  private _groupBy: Array<Column> = []
  private _offset: number | null = null
  private _limit: number | null = null
  private _orderBy: Array<Column> = []

  select(...fields: Array<Column | string>): this {
    this._select.push(...fields)
    return this
  }

  from(...tables: Array<Table>): this {
    this._from.push(...tables)
    return this
  }

  join(...joins: Array<SqlJoinBuilder>): this {
    this._join.push(...joins)
    return this
  }

  where(...conditions: Array<string>): this {
    this._where.push(...conditions)
    return this
  }

  groupBy(...fields: Array<Column>): this {
    this._groupBy.push(...fields)
    return this
  }

  offset(offset: number): this {
    this._offset = offset
    return this
  }

  limit(limit: number): this {
    this._limit = limit
    return this
  }

  orderBy(...fields: Array<Column>): this {
    this._orderBy.push(...fields)
    return this
  }

  build(): string {
    const parts: Array<string> = [`SELECT ${this._select.join(', ')}`, `FROM ${this._from.join(' ')}`]

    if (!Objects.isEmpty(this._join)) {
      parts.push(`${this._join.map((join) => join.build()).join(' ')}`)
    }
    if (!Objects.isEmpty(this._where)) {
      parts.push(`WHERE ${this._where.join(' ')}`)
    }
    if (!Objects.isEmpty(this._groupBy)) {
      parts.push(`GROUP BY ${this._groupBy.join(', ')}`)
    }
    if (!Objects.isEmpty(this._orderBy)) {
      parts.push(`ORDER BY ${this._orderBy.join(', ')}`)
    }
    if (this._offset) {
      parts.push(`OFFSET ${this._offset}`)
    }
    if (this._limit) {
      parts.push(`LIMIT ${this._limit}`)
    }
    return parts.join(' ')
  }
}
