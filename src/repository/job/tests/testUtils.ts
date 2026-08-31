import { DB } from '../../../db'

export const insertTestUser = async (): Promise<string> => {
  const { uuid } = await DB.one<{ uuid: string }>(
    `INSERT INTO "user" (email, status) VALUES ($1, 'ACCEPTED') RETURNING uuid`,
    [`job-test-${Date.now()}@openforis-arena.org`]
  )
  return uuid
}

export const deleteTestUser = async (userUuid: string): Promise<void> => {
  await DB.none(`DELETE FROM "user" WHERE uuid = $1`, [userUuid])
}

export const insertTestSurvey = async (ownerUuid: string): Promise<number> => {
  const { id } = await DB.one<{ id: number }>(`INSERT INTO survey (owner_uuid) VALUES ($1) RETURNING id`, [ownerUuid])
  return id
}

export const deleteTestSurvey = async (surveyId: number): Promise<void> => {
  await DB.none(`DELETE FROM survey WHERE id = $1`, [surveyId])
}
