import { ArenaMessage, MessageStatus } from '@openforis/arena-core'

export const transformCallbackSafe = (row: any): ArenaMessage | null => {
  if (!row) return null
  return {
    uuid: row.uuid,
    status: row.status as MessageStatus,
    props: row.props || {},
    createdByUserUuid: row.created_by_user_uuid,
    dateCreated: row.date_created,
    dateModified: row.date_modified,
  }
}

export const transformCallback = (row: any): ArenaMessage => transformCallbackSafe(row)!
