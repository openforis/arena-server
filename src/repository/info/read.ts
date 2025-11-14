import { BaseProtocol, DB, SqlSelectBuilder, TableInfo } from '../../db'
import { InfoItem, InfoItemKey } from './types'
import { transformCallback } from './utils'

/**
 * Returns all info records.
 *
 * @param client - Database client.
 */
export const getAll = (client: BaseProtocol = DB): Promise<InfoItem[]> => {
  const table = new TableInfo()

  const sql = new SqlSelectBuilder().select(table.keyName, table.keyValue, table.modifiedDate).from(table).build()

  return client.map<InfoItem>(sql, [], transformCallback)
}

/**
 * Returns an info record by key name.
 *
 * @param key - The info item key.
 * @param client - Database client.
 */
export const getByKey = async (key: InfoItemKey, client: BaseProtocol = DB): Promise<InfoItem | null> => {
  const table = new TableInfo()
  const sql = new SqlSelectBuilder()
    .select(table.keyName, table.keyValue, table.modifiedDate)
    .from(table)
    .where(`${table.keyName} = $1`)
    .build()

  return client.oneOrNone<InfoItem | null>(sql, [key], transformCallback)
}
