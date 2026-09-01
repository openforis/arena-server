import { BaseProtocol, DB, TableRecordSocketAssociation } from '../../db'

/**
 * Removes every association for a record.
 *
 * @param recordUuid - Record UUID
 * @param client - Database client
 */
export const dissocSocketsByRecordUuid = async (recordUuid: string, client: BaseProtocol = DB): Promise<void> => {
  const table = new TableRecordSocketAssociation()
  const sql = `DELETE FROM ${table.nameQualified} WHERE ${table.recordUuid.columnName} = $1`
  await client.none(sql, [recordUuid])
}
