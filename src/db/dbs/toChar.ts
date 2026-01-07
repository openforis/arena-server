import { Column } from '../column'

export const toChar = (columnName: string | Column, alias?: string): string => {
  const columnAlias = columnName instanceof Column ? columnName.columnName : columnName
  return `to_char(${columnName},'YYYY-MM-DD"T"HH24:MI:ssZ') as ${alias ?? columnAlias}`
}
