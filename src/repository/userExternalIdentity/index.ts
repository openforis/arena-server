import { BaseProtocol, DB, DBs } from '../../db'
import { UserExternalIdentity } from '../../model'

const selectFields = `id::text AS id, user_uuid, provider_id, issuer, subject, email, date_created, date_last_used`

const transform = (row: any): UserExternalIdentity => DBs.transformCallback({ row })

const insert = (
  params: { userUuid: string; providerId: string; issuer: string; subject: string; email?: string },
  client: BaseProtocol = DB
): Promise<UserExternalIdentity> => {
  const { userUuid, providerId, issuer, subject, email = null } = params
  return client.one(
    `INSERT INTO user_external_identity (user_uuid, provider_id, issuer, subject, email, date_last_used)
     VALUES ($/userUuid/, $/providerId/, $/issuer/, $/subject/, $/email/, (now() AT TIME ZONE 'UTC'))
     RETURNING ${selectFields}`,
    { userUuid, providerId, issuer, subject, email },
    transform
  )
}

const getById = (id: string, client: BaseProtocol = DB): Promise<UserExternalIdentity | null> =>
  client.oneOrNone(`SELECT ${selectFields} FROM user_external_identity WHERE id = $1`, [id], transform)

const getByIssuerAndSubject = (
  params: { issuer: string; subject: string },
  client: BaseProtocol = DB
): Promise<UserExternalIdentity | null> =>
  client.oneOrNone(
    `SELECT ${selectFields} FROM user_external_identity WHERE issuer = $/issuer/ AND subject = $/subject/`,
    params,
    transform
  )

const getByUserUuid = (userUuid: string, client: BaseProtocol = DB): Promise<UserExternalIdentity[]> =>
  client.map(
    `SELECT ${selectFields} FROM user_external_identity WHERE user_uuid = $1 ORDER BY date_created`,
    [userUuid],
    transform
  )

const getByUserUuidAndProviderId = (
  params: { userUuid: string; providerId: string },
  client: BaseProtocol = DB
): Promise<UserExternalIdentity | null> =>
  client.oneOrNone(
    `SELECT ${selectFields} FROM user_external_identity WHERE user_uuid = $/userUuid/ AND provider_id = $/providerId/`,
    params,
    transform
  )

/**
 * Returns the number of linked users per provider id.
 */
const countByProvider = async (client: BaseProtocol = DB): Promise<Record<string, number>> => {
  const rows = await client.any(
    `SELECT provider_id, COUNT(*) AS count FROM user_external_identity GROUP BY provider_id`
  )
  return Object.fromEntries(rows.map((row) => [row.provider_id, Number(row.count)]))
}

/**
 * Updates the last used date and the email (as last seen at the provider).
 */
const touch = async (params: { id: string; email?: string }, client: BaseProtocol = DB): Promise<void> => {
  const { id, email = null } = params
  await client.none(
    `UPDATE user_external_identity
     SET date_last_used = (now() AT TIME ZONE 'UTC'), email = COALESCE($/email/, email)
     WHERE id = $/id/`,
    { id, email }
  )
}

const deleteById = (id: string, client: BaseProtocol = DB): Promise<boolean> =>
  client.result(`DELETE FROM user_external_identity WHERE id = $1`, [id], (result) => result.rowCount > 0)

const deleteByProviderId = (providerId: string, client: BaseProtocol = DB): Promise<number> =>
  client.result(`DELETE FROM user_external_identity WHERE provider_id = $1`, [providerId], (result) => result.rowCount)

/**
 * Users linked to the given provider that have no password and no other linked provider:
 * they would be left without any sign-in method if the link were removed.
 */
const getUsersWithoutOtherSignInMethod = (
  providerId: string,
  client: BaseProtocol = DB
): Promise<{ uuid: string; name: string | null; email: string }[]> =>
  client.any(
    `SELECT u.uuid, u.name, u.email
     FROM user_external_identity uei
       JOIN "user" u ON u.uuid = uei.user_uuid
     WHERE uei.provider_id = $1
       AND u.password IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM user_external_identity other
         WHERE other.user_uuid = uei.user_uuid AND other.provider_id <> uei.provider_id
       )
     ORDER BY u.name, u.email`,
    [providerId]
  )

export const UserExternalIdentityRepository = {
  insert,
  getById,
  getByIssuerAndSubject,
  getByUserUuid,
  getByUserUuidAndProviderId,
  countByProvider,
  touch,
  deleteById,
  deleteByProviderId,
  getUsersWithoutOtherSignInMethod,
}
