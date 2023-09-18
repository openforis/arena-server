import { DB } from '../../../db'
import { mockUser } from '../mock/user'

export const insertTestUser = async (): Promise<void> =>
  DB.tx(async (tx) => {
    const { name, email } = mockUser
    const passwordEncrypted = '$2a$10$6y2oUZVrQ7aXed.47h4sHeJA8VVA2dW9ObtO/XLveXSzQKBvTOyou'

    const userDb = await tx.oneOrNone(
      `SELECT *
       FROM "user" u
       WHERE u.email = $1`,
      [email]
    )
    if (userDb) {
      return
    }
    await tx.none(
      `INSERT INTO "user" (name, email, PASSWORD, status)
        VALUES ($1, $2, $3, 'ACCEPTED')`,
      [name, email, passwordEncrypted]
    )
    await tx.none(
      `INSERT INTO auth_group_user (user_uuid, group_uuid)
        SELECT
            u.uuid,
            g.uuid
        FROM
            "user" u
        JOIN auth_group g ON u.email = 'test@openforis-arena.org'
            AND g.name = 'systemAdmin'`
    )
  })
