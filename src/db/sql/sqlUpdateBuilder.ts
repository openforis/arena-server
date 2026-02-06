import { Objects } from '@openforis/arena-core'
import { SqlBuilder } from './sqlBuilder'
import { Table } from '../table'
import { Column } from '../column'

type SetType = { column: Column | string; value: string }

export class SqlUpdateBuilder extends SqlBuilder {
  private _update: Table | null = null
  private _set: SetType[] = []
  private _where: string[] = []
  private _returning: Column[] = []

  update(table: Table): this {
    this._update = table
    return this
  }

  set(column: Column | string, value: string): this {
    this._set.push({ column, value })
    return this
  }

  setByColumnValues(values: Record<string, string>): this {
    for (const columnName of Object.keys(values)) {
      this.set(columnName, `$/${columnName}/`)
    }
    return this
  }

  where(...conditions: Array<string>): this {
    this._where.push(...conditions)
    return this
  }

  returning(...fields: Array<Column>): this {
    this._returning.push(...fields)
    return this
  }

  build(): string {
    if (Objects.isEmpty(this._update) || Objects.isEmpty(this._set))
      throw new Error(`missingParams, ${this._update}, ${this._set}`)
    const _getColumnName = (column: Column | string) => (typeof column === 'string' ? column : column.columnName)
    const _buildSetValue = (params: SetType): string => {
      const { column, value } = params
      return `${_getColumnName(column)} = ${value}`
    }
    const parts: Array<string> = [`UPDATE ${this._update}`, `SET ${this._set.map(_buildSetValue).join(', ')}`]

    if (!Objects.isEmpty(this._where)) {
      parts.push(`WHERE ${this._where.join(' ')}`)
    }

    if (!Objects.isEmpty(this._returning)) {
      parts.push(`RETURNING ${this._returning.join(', ')}`)
    }

    return parts.join(' ')
  }
}
