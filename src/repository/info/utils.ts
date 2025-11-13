import { InfoItem } from './types'

export const transformCallbackSafe = (row: any): InfoItem | null => {
  if (!row) return null
  return {
    key: row.key_name,
    value: row.key_value,
    modifiedDate: row.modified_date,
  }
}

export const transformCallback = (row: any): InfoItem => transformCallbackSafe(row)!
