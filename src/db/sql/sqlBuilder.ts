export abstract class SqlBuilder {
  params: { [paramName: string]: string } = {}

  abstract build(): string
}
