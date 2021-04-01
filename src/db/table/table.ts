import { SQLs } from '../sql'

export abstract class Table {
  readonly schema: string
  readonly name: string
  alias: string

  protected constructor(schema: string, name: string) {
    this.schema = schema
    this.name = name
    this.alias = SQLs.createAlias(name)
  }

  get nameQualified() {
    return `${this.schema}."${this.name}"`
  }

  get nameAliased() {
    return `${this.nameQualified} AS ${this.alias}`
  }

  toString(): string {
    return this.nameAliased
  }
}
