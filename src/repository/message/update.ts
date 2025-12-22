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

  const values: any[] = []
  let paramIndex = 1

  const updateBuilder = new SqlUpdateBuilder().update(table)

  if (status !== undefined) {
    updateBuilder.set(table.status, `${paramIndex++}`)
    values.push(status)
  }
  if (props !== undefined) {
    updateBuilder.set(table.props, `${paramIndex++}`)
    values.push(props)
  }
  // Always update date_modified
  updateBuilder.set(table.dateModified, `(now() AT TIME ZONE 'UTC')`)

  values.push(uuid)

  const sql = updateBuilder
    .where(`${table.uuid} = $${paramIndex}`)
    .returning(table.uuid, table.status, table.props, table.createdByUserUuid, table.dateCreated, table.dateModified)
    .build()

  return client.one<Message>(sql, values, transformCallback)
}
