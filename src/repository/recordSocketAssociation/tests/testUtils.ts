import { DB } from '../../../db'

export const insertTestUser = async (): Promise<string> => {
  const { uuid } = await DB.one<{ uuid: string }>(
    `INSERT INTO "user" (email, status) VALUES ($1, 'ACCEPTED') RETURNING uuid`,
    [`record-socket-association-test-${Date.now()}@openforis-arena.org`]
  )
  return uuid
}

export const deleteTestUser = async (userUuid: string): Promise<void> => {
  await DB.none(`DELETE FROM "user" WHERE uuid = $1`, [userUuid])
}

export const insertTestSocket = async (userUuid: string, socketId: string): Promise<void> => {
  await DB.none(`INSERT INTO connected_socket (socket_id, user_uuid) VALUES ($1, $2)`, [socketId, userUuid])
}

export const deleteTestSocket = async (socketId: string): Promise<void> => {
  await DB.none(`DELETE FROM connected_socket WHERE socket_id = $1`, [socketId])
}
