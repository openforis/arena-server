import { Objects } from '@openforis/arena-core'
import { Table } from '../table'
import { SqlBuilder } from './sqlBuilder'

export class SqlJoinBuilder extends SqlBuilder {
  private _tables: Array<Table> = []
  private _on: Array<string> = []

  join(table: Table): this {
    this._tables.push(table)
    return this
  }

  on(condition: string): this {
    this._on.push(condition)
    return this
  }

  build(): string {
    if (Objects.isEmpty(this._tables) || Objects.isEmpty(this._on))
      throw new Error(`missingParams: ${{ tables: this._tables }}, ${{ _on: this._on }}`)
    return `JOIN ${this._tables.join(' ')} ON ${this._on.join(' ')}`
  }
}
