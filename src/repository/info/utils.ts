import { InfoItem } from './types'

export const transformCallback = (row: any): InfoItem => ({
  key: row.key_name,
  value: row.key_value,
  modifiedDate: row.modified_date,
})
