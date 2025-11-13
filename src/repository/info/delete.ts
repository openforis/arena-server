import { BaseProtocol, DB, SqlDeleteBuilder, TableInfo } from '../../db'
import { InfoItem, InfoItemKey } from './types'
import { transformCallback } from './utils'

/**
 * Deletes an info record by key name.
 *
 * @param key - The info item key.
 * @param client - Database client.
 */
export const deleteItem = (key: InfoItemKey, client: BaseProtocol = DB): Promise<InfoItem | null> => {
  const table = new TableInfo()

  const values = {
    [table.keyName.columnName]: key,
  }

  const sql = new SqlDeleteBuilder()
    .deleteFrom(table)
    .where(values)
    .returning(table.keyName, table.keyValue, table.modifiedDate)
    .build()

  return client.oneOrNone<InfoItem>(sql, values, transformCallback)
}
