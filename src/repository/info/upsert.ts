import { BaseProtocol, DB, TableInfo } from '../../db'
import { InfoItem } from './types'
import { transformCallback } from './utils'

/**
 * Inserts or updates an info record.
 * If a record with the same key_name exists, it will be updated.
 *
 * @param params - Parameters containing the info data.
 * @param client - Database client.
 */
export const upsert = (item: InfoItem, client: BaseProtocol = DB): Promise<InfoItem> => {
  const { key, value } = item

  const table = new TableInfo()

  // Build INSERT ... ON CONFLICT UPDATE query
  const sql = `
    INSERT INTO ${table.nameQualified}
      (${table.keyName.columnName}, ${table.keyValue.columnName})
    VALUES
      ($1, $2)
    ON CONFLICT (${table.keyName.columnName})
    DO UPDATE SET
      ${table.keyValue.columnName} = EXCLUDED.${table.keyValue.columnName},
      ${table.modifiedDate.columnName} = (now() AT TIME ZONE 'UTC')
    RETURNING
      ${table.keyName.columnName},
      ${table.keyValue.columnName},
      ${table.modifiedDate.columnName}
  `

  return client.one<InfoItem>(sql, [key, value], transformCallback)
}
