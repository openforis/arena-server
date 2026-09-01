import { DB } from '../../../db'

export const insertTestUser = async (): Promise<string> => {
  const { uuid } = await DB.one<{ uuid: string }>(
    `INSERT INTO "user" (email, status) VALUES ($1, 'ACCEPTED') RETURNING uuid`,
    [`connected-socket-test-${Date.now()}@openforis-arena.org`]
  )
  return uuid
}

export const deleteTestUser = async (userUuid: string): Promise<void> => {
  await DB.none(`DELETE FROM "user" WHERE uuid = $1`, [userUuid])
}
