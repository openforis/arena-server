import { BaseProtocol, DB, SqlSelectBuilder, TableInfo } from '../../db'
import { InfoItem } from './types'
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
 * @param params - Parameters containing the key name.
 * @param client - Database client.
 */
export const getByKey = async (
  params: {
    keyName: string
  },
  client: BaseProtocol = DB
): Promise<InfoItem | null> => {
  const { keyName } = params
  if (!keyName) throw new Error(`missingParams, ${params}`)

  const table = new TableInfo()
  const sql = new SqlSelectBuilder()
    .select(table.keyName, table.keyValue, table.modifiedDate)
    .from(table)
    .where(`${table.keyName} = $1`)
    .build()

  return client.oneOrNone<InfoItem>(sql, [keyName], transformCallback)
}
