import { Message } from '@openforis/arena-core'

import { BaseProtocol, DB, SqlDeleteBuilder } from '../../db'
import { TableMessage } from '../../db/table/schemaPublic/message'
import { transformCallback } from './utils'

/**
 * Deletes a message by UUID.
 *
 * @param uuid - The message UUID.
 * @param client - Database client.
 */
export const deleteByUuid = (uuid: string, client: BaseProtocol = DB): Promise<Message | null> => {
  const table = new TableMessage()

  const values = { [table.uuid.columnName]: uuid }

  const sql = new SqlDeleteBuilder()
    .deleteFrom(table)
    .where(values)
    .returning(table.uuid, table.status, table.props, table.createdByUserUuid, table.dateCreated, table.dateModified)
    .build()

  return client.oneOrNone<Message>(sql, values, transformCallback)
}
