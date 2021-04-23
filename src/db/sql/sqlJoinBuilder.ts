import { Table } from '../table'
import { SqlBuilder } from './sqlBuilder'
import { Objects } from '@openforis/arena-core'

export class SqlJoinBuilder extends SqlBuilder {
  private _tables: Array<Table> = []
  private _on: Array<string> = []

  join(...tables: Array<Table>): this {
    this._tables.push(...tables)
    return this
  }

  on(...conditions: Array<string>): this {
    this._on.push(...conditions)
    return this
  }

  build(): string {
    if (Objects.isEmpty(this._tables) || Objects.isEmpty(this._on))
      throw new Error(`missingParams: ${{ tables: this._tables }}, ${{ _on: this._on }}`)
    return `JOIN ${this._tables.join(' ')} ON ${this._on.join(' ')}`
  }
}
