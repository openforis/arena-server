import { Column } from '../column'
export const toChar = (columnName: string | Column, alias?: string): string =>
  `to_char(${columnName},'YYYY-MM-DD"T"HH24:MI:ssZ') as ${alias ?? columnName}`
