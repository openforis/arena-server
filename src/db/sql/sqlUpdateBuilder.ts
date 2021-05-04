import { Objects } from '@openforis/arena-core'
import { SqlBuilder } from './sqlBuilder'
import { Table } from '../table'
import { Column } from '../column'

type setType = { column: Column | string; value: string }

export class SqlUpdateBuilder extends SqlBuilder {
  private _update: Table | null = null
  private _set: setType[] = []
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
    const parts: Array<string> = [
      `UPDATE ${this._update}`,
      `SET ${this._set.map(({ column, value }: setType) => `${column} = ${value}`).join(', ')}`,
    ]

    if (!Objects.isEmpty(this._where)) {
      parts.push(`WHERE ${this._where.join(' ')}`)
    }

    if (!Objects.isEmpty(this._returning)) {
      parts.push(`RETURNING ${this._returning.join(', ')}`)
    }

    return parts.join(' ')
  }
}
