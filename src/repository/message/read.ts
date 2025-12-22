import { BaseProtocol, DB, SqlSelectBuilder } from '../../db'
import { TableMessage } from '../../db/table/schemaPublic/message'
import { Message } from '../../model/message/types'
import { transformCallback } from './utils'

/**
 * Returns all message records.
 *
 * @param client - Database client.
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
 * @returns
 */
export const getAllSent = (client: BaseProtocol = DB): Promise<Message[]> => {
  const table = new TableMessage()

  const sql = new SqlSelectBuilder()
    .select(table.uuid, table.status, table.props, table.createdByUserUuid, table.dateCreated, table.dateModified)
    .from(table)
    .where(`${table.status} = $1`)
    .build()

  return client.map<Message>(sql, ['SENT'], transformCallback)
}

/**
 * Returns a message by UUID.
 *
 * @param uuid - The message UUID.
 * @param client - Database client.
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
