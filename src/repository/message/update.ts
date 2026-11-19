import { ArenaMessage } from '@openforis/arena-core'

import { BaseProtocol, DB, SqlUpdateBuilder } from '../../db'
import { TableMessage } from '../../db/table/schemaPublic/message'
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
  message: Partial<Omit<ArenaMessage, 'uuid' | 'createdByUserUuid' | 'dateCreated' | 'dateModified'>>,
  client: BaseProtocol = DB
): Promise<ArenaMessage> => {
  const table = new TableMessage()
  const { status, props } = message

  const updateBuilder = new SqlUpdateBuilder().update(table)

  if (status !== undefined) {
    updateBuilder.set(table.status, `$/status/`)
  }
  if (props !== undefined) {
    updateBuilder.set(table.props, `$/props/`)
  }
  // Always update date_modified
  updateBuilder.set(table.dateModified, `(now() AT TIME ZONE 'UTC')`)

  const sql = updateBuilder
    .where(`${table.uuid} = $/uuid/`)
    .returning(table.uuid, table.status, table.props, table.createdByUserUuid, table.dateCreated, table.dateModified)
    .build()

  return client.one<ArenaMessage>(sql, { status, props, uuid }, transformCallback)
}
