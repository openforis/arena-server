import { Message, MessageStatus } from '@openforis/arena-core'

import { BaseProtocol, DB, SqlSelectBuilder } from '../../db'
import { TableMessage } from '../../db/table/schemaPublic/message'
import { transformCallback } from './utils'

/**
 * Counts all message records.
 *
 * @param client - Database client.
 * @returns Promise that resolves to the count of messages.
 */
export const count = (client: BaseProtocol = DB): Promise<number> => {
  const table = new TableMessage()

  const sql = new SqlSelectBuilder().select(`count(${table.alias}.*)`).from(table).build()

  return client.one<number>(sql, [], (row) => Number(row.count))
}

/**
 * Returns all message records.
 *
 * @param client - Database client.
 * @returns Promise that resolves to an array of messages.
 */
export const getAll = (client: BaseProtocol = DB): Promise<Message[]> => {
  const table = new TableMessage()

  const sql = new SqlSelectBuilder()
    .select(table.uuid, table.status, table.props, table.createdByUserUuid, table.dateCreated, table.dateModified)
    .from(table)
    .build()

  return client.map<Message>(sql, [], transformCallback)
}

/**
 * Returns all sent messages.
 *
 * @param client - Database client.
 * @returns Promise that resolves to an array of sent messages.
 */
export const getAllSent = (client: BaseProtocol = DB): Promise<Message[]> => {
  const table = new TableMessage()

  const sql = new SqlSelectBuilder()
    .select(table.uuid, table.status, table.props, table.createdByUserUuid, table.dateCreated, table.dateModified)
    .from(table)
    .where(`${table.status} = $1`)
    .build()

  return client.map<Message>(sql, [MessageStatus.Sent], transformCallback)
}

/**
 * Returns a message by UUID.
 *
 * @param uuid - The message UUID.
 * @param client - Database client.
 * @returns Promise that resolves to a message or null if not found.
 */
export const getByUuid = async (uuid: string, client: BaseProtocol = DB): Promise<Message | null> => {
  const table = new TableMessage()

  const sql = new SqlSelectBuilder()
    .select(table.uuid, table.status, table.props, table.createdByUserUuid, table.dateCreated, table.dateModified)
    .from(table)
    .where(`${table.uuid} = $1`)
    .build()

  return client.oneOrNone<Message | null>(sql, [uuid], transformCallback)
}
