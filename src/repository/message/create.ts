import { UUIDs } from '@openforis/arena-core'
import { BaseProtocol, DB, SqlInsertBuilder } from '../../db'
import { TableMessage } from '../../db/table/schemaPublic/message'
import { Message, MessageStatus } from '../../model/message/types'
import { transformCallback } from './utils'

/**
 * Creates a new message.
 *
 * @param message - Message data to insert.
 * @param client - Database client.
 */
export const create = (message: Partial<Message>, client: BaseProtocol = DB): Promise<Message> => {
  const table = new TableMessage()

  const { uuid = UUIDs.v4(), status = MessageStatus.Draft, props = {}, createdByUserUuid } = message

  const sql = new SqlInsertBuilder()
    .insertInto(table)
    .valuesByColumn({
      [table.uuid.columnName]: uuid,
      [table.status.columnName]: status,
      [table.props.columnName]: props,
      [table.createdByUserUuid.columnName]: createdByUserUuid,
    })
    .returning(table.uuid, table.status, table.props, table.createdByUserUuid, table.dateCreated, table.dateModified)
    .build()

  return client.one<Message>(sql, [], transformCallback)
}
