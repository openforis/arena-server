import { UserStatus } from '@openforis/arena-core'

import { BaseProtocol, DB } from '../../db'

export interface UserForExternalLogin {
  uuid: string
  name: string | null
  email: string
  status: UserStatus
  hasPassword: boolean
}

const gmailDomains = ['gmail.com', 'googlemail.com']

// same normalization as normalizeEmail, in SQL: Gmail ignores dots and "+suffix" in the local part
const normalizedEmailSql = `CASE
    WHEN lower(split_part(email, '@', 2)) IN ('gmail.com', 'googlemail.com')
    THEN regexp_replace(lower(split_part(email, '@', 1)), '\\+.*$|\\.', '', 'g') || '@gmail.com'
    ELSE lower(email)
  END`

/**
 * Normalizes an email for matching: lowercase; for Gmail addresses also removes dots and "+suffix" from the local part
 * and uses gmail.com as domain (Gmail delivers all those variants to the same mailbox).
 */
export const normalizeEmail = (email: string): string => {
  const lower = email.trim().toLowerCase()
  const atIndex = lower.lastIndexOf('@')
  if (atIndex < 0) return lower
  const local = lower.substring(0, atIndex)
  const domain = lower.substring(atIndex + 1)
  if (!gmailDomains.includes(domain)) return lower
  return `${local.replace(/\+.*$/, '').replaceAll('.', '')}@gmail.com`
}

const userSelectFields = `uuid, name, email, status, password IS NOT NULL AS has_password`

const transformUser = (row: any): UserForExternalLogin => ({
  uuid: row.uuid,
  name: row.name,
  email: row.email,
  status: row.status,
  hasPassword: row.has_password,
})

/**
 * Users whose email matches the given one (case-insensitive, Gmail variants normalized).
 */
export const findByNormalizedEmail = (email: string, client: BaseProtocol = DB): Promise<UserForExternalLogin[]> =>
  client.map(
    `SELECT ${userSelectFields} FROM "user" WHERE ${normalizedEmailSql} = $1`,
    [normalizeEmail(email)],
    transformUser
  )

export const getForExternalLogin = (
  userUuid: string,
  client: BaseProtocol = DB
): Promise<UserForExternalLogin | null> =>
  client.oneOrNone(`SELECT ${userSelectFields} FROM "user" WHERE uuid = $1`, [userUuid], transformUser)

/**
 * Returns the uuid of the invited user of a valid (not expired) reset password / invitation request.
 */
export const getInvitedUserUuidByResetPasswordUuid = (
  resetPasswordUuid: string,
  client: BaseProtocol = DB
): Promise<string | null> =>
  client.oneOrNone(
    `SELECT u.uuid
     FROM user_reset_password urp
       JOIN "user" u ON u.uuid = urp.user_uuid
     WHERE urp.uuid = $1
       AND urp.date_created >= NOW() - INTERVAL '168 HOURS'
       AND u.status = $2`,
    [resetPasswordUuid, UserStatus.INVITED],
    (row) => row?.uuid ?? null
  )

/**
 * Accepts the invitation of a user signing in with an external provider: no password is set.
 * The name is kept if already set, otherwise the given one is used.
 */
export const acceptInvitationExternal = (
  params: { userUuid: string; name?: string },
  client: BaseProtocol = DB
): Promise<void> =>
  client.tx(async (tx) => {
    const { userUuid, name = null } = params
    await tx.none(
      `UPDATE "user"
       SET status = $/status/, name = COALESCE(NULLIF(name, ''), $/name/)
       WHERE uuid = $/userUuid/`,
      { status: UserStatus.ACCEPTED, name, userUuid }
    )
    await tx.none(`DELETE FROM user_reset_password WHERE user_uuid = $1`, [userUuid])
  })
