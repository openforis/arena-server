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

  const sql = new SqlDeleteBuilder()
    .deleteFrom(table)
    .where({ [table.uuid.columnName]: uuid })
    .returning(table.uuid, table.status, table.props, table.createdByUserUuid, table.dateCreated, table.dateModified)
    .build()

  return client.oneOrNone<Message>(sql, [], transformCallback)
}
