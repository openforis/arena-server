import { SQLs } from '../sql'

export abstract class Table {
  readonly schema: string
  readonly tableName: string
  alias: string

  protected constructor(schema: string, tableName: string) {
    this.schema = schema
    this.tableName = tableName
    this.alias = SQLs.createAlias(tableName)
  }

  get nameQualified() {
    return `${this.schema}."${this.tableName}"`
  }

  get nameAliased() {
    return `${this.nameQualified} AS ${this.alias}`
  }

  toString(): string {
    return this.nameAliased
  }
}
