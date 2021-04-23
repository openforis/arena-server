import { Table } from '../table'
import { SqlBuilder } from './sqlBuilder'
import { Objects } from '@openforis/arena-core'

export class SqlJoinBuilder extends SqlBuilder {
  private _join: Array<Table> = []
  private _on: Array<string> = []

  join(...tables: Array<Table>): this {
    this._join.push(...tables)
    return this
  }

  on(...conditions: Array<string>): this {
    this._on.push(...conditions)
    return this
  }

  build(): string {
    if (Objects.isEmpty(this._join) || Objects.isEmpty(this._on))
      throw new Error(`missingParams: ${{ _join: this._join }}, ${{ _on: this._on }}`)
    return `JOIN ${this._join.join(' ')} ON ${this._on.join(' ')}`
  }
}
