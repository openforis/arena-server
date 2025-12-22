import { BaseProtocol, DB, SqlUpdateBuilder } from '../../db'
import { TableMessage } from '../../db/table/schemaPublic/message'
import { Message } from '../../model/message/types'
import { transformCallback } from './utils'

/**
 * Updates a message.
 *
 * @param uuid - The message UUID.
 * @param message - Partial message data to update.
 * @param client - Database client.
 */
export const update = (
  uuid: string,
  message: Partial<Omit<Message, 'uuid' | 'createdByUserUuid' | 'dateCreated' | 'dateModified'>>,
  client: BaseProtocol = DB
): Promise<Message> => {
  const table = new TableMessage()
  const { status, props } = message

  const updates: string[] = []
  const values: any[] = []
  let paramIndex = 1

  if (status !== undefined) {
    updates.push(`${table.status} = $${paramIndex++}`)
    values.push(status)
  }

  if (props !== undefined) {
    updates.push(`${table.props} = $${paramIndex++}`)
    values.push(JSON.stringify(props))
  }

  // Always update date_modified
  updates.push(`${table.dateModified} = (now() AT TIME ZONE 'UTC')`)

  values.push(uuid)

  const sql = new SqlUpdateBuilder()
    .update(table)
    .set(updates.join(', '))
    .where(`${table.uuid} = $${paramIndex}`)
    .returning(table.uuid, table.status, table.props, table.createdByUserUuid, table.dateCreated, table.dateModified)
    .build()

  return client.one<Message>(sql, values, transformCallback)
}
