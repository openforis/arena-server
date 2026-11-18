import { ServiceRegistry, UserStatus } from '@openforis/arena-core'
import { generateSync } from 'otplib'
import { Response } from 'supertest'

import { DB } from '../../../../db'
import { AuthProviderType } from '../../../../model'
import { ProcessEnv } from '../../../../processEnv'
import { ServerServiceType } from '../../../../server'
import { User2FADeviceRepository } from '../../../../repository'
import { AuthProviderService, User2FAServiceServer } from '../../../../service'
import { ExternalLoginErrorKeys } from '../../../../service/externalLogin'
import { ApiEndpoint } from '../../../endpoint'
import { mockUser } from '../../mock/user'
import { ApiTest } from '../../utils/apiTest'
import { MockOidcProvider } from '../../utils/mockOidcProvider'

declare global {
  var api: ApiTest
}

const providerId = 'test-oidc'
const testEmailDomain = 'external-login.test'
const invitedEmail = `invited@${testEmailDomain}`
const gmailUserEmail = 'Ext.Login.Tester@gmail.com'

const mockProvider = new MockOidcProvider()

const getAuthProviderService = (): AuthProviderService =>
  ServiceRegistry.getInstance().getService(ServerServiceType.authProvider) as AuthProviderService

const getCookies = (res: Response): string[] => {
  const header = res.headers['set-cookie'] as string | string[] | undefined
  if (!header) return []
  return Array.isArray(header) ? header : [header]
}

const getCookie = (res: Response, name: string): string | undefined =>
  getCookies(res)
    .find((cookie) => cookie.startsWith(`${name}=`) && !cookie.startsWith(`${name}=;`))
    ?.split(';')[0]

/**
 * Runs a sign-in through the mock provider and returns where the callback redirects to.
 */
const runFlow = async (params: {
  claims: Record<string, unknown>
  query?: Record<string, string>
}): Promise<{ location: string; callbackRes: Response }> => {
  const { claims, query = {} } = params
  mockProvider.setClaims(claims)
  const startRes = await globalThis.api
    .getRaw(`${ApiEndpoint.auth.externalLoginStart(providerId)}?${new URLSearchParams(query)}`)
    .expect(302)
  const flowCookie = getCookie(startRes, 'externalLoginFlow')
  expect(flowCookie).toBeDefined()
  const authorizeRes = await fetch(startRes.headers.location, { redirect: 'manual' })
  const callbackUrl = new URL(authorizeRes.headers.get('location')!)
  const callbackRes = await globalThis.api
    .getRaw(`${callbackUrl.pathname}${callbackUrl.search}`)
    .set('Cookie', flowCookie!)
    .expect(302)
  return { location: callbackRes.headers.location, callbackRes }
}

const getErrorKey = (location: string): string | null =>
  new URL(location, 'http://localhost').searchParams.get('externalLoginError')

const insertUser = (params: { email: string; status: UserStatus; withPassword?: boolean }): Promise<string> =>
  DB.one(
    `INSERT INTO "user" (name, email, password, status) VALUES ('', $1, $2, $3) RETURNING uuid`,
    [params.email, params.withPassword ? 'not-a-real-hash' : null, params.status],
    (row) => row.uuid
  )

const cleanUp = async (): Promise<void> => {
  await DB.none(`DELETE FROM user_external_identity WHERE provider_id = $1`, [providerId])
  await DB.none(`DELETE FROM "user" WHERE email LIKE $1 OR lower(email) = lower($2)`, [
    `%@${testEmailDomain}`,
    gmailUserEmail,
  ])
  await DB.none(`DELETE FROM auth_provider WHERE id = $1`, [providerId])
}

const externalLoginTests = (): void =>
  describe('External login (OpenID Connect)', () => {
    beforeAll(async () => {
      ProcessEnv.authProviderSecretEncryptionKey = 'a'.repeat(64)
      await mockProvider.start()
      await cleanUp()
      await getAuthProviderService().create({
        id: providerId,
        type: AuthProviderType.oidc,
        props: { label: 'Test OIDC', issuer: mockProvider.issuer, clientId: 'arena-test', requireArena2FA: false },
        clientSecret: 'arena-test-secret',
      })
    })

    afterAll(async () => {
      await cleanUp()
      getAuthProviderService().invalidateCache()
      mockProvider.stop()
    })

    test('lists the provider for the login page', async () => {
      const { body } = await globalThis.api.get(ApiEndpoint.auth.externalLoginProviders()).expect(200)
      expect(body).toEqual(expect.arrayContaining([expect.objectContaining({ id: providerId, label: 'Test OIDC' })]))
      // no secrets or connection settings in the public list
      expect(JSON.stringify(body)).not.toContain('arena-test-secret')
      expect(JSON.stringify(body)).not.toContain('arena-test"')
    })

    test('reorders the providers', async () => {
      const service = getAuthProviderService()
      await service.update({ id: providerId, props: { order: 5 } })
      expect((await service.get(providerId))?.order).toBe(5)
      await service.reorder(['not-existing', providerId])
      const provider = await service.get(providerId)
      expect(provider?.order).toBe(1)
    })

    test('refuses an unknown user', async () => {
      const { location } = await runFlow({
        claims: { sub: 'unknown-1', email: `nobody@${testEmailDomain}`, email_verified: true },
      })
      expect(getErrorKey(location)).toBe(ExternalLoginErrorKeys.userNotFound)
    })

    test('refuses an unverified email', async () => {
      const { location } = await runFlow({ claims: { sub: 'unverified-1', email: mockUser.email } })
      expect(getErrorKey(location)).toBe(ExternalLoginErrorKeys.emailNotVerified)
    })

    test('links an existing user by verified email and logs in', async () => {
      const { location, callbackRes } = await runFlow({
        claims: { sub: 'tester-1', email: mockUser.email.toUpperCase(), email_verified: true, name: 'Tester' },
      })
      expect(location).toBe('/app/home/')
      expect(getCookie(callbackRes, 'refreshToken')).toBeDefined()
      const identity = await DB.oneOrNone(`SELECT * FROM user_external_identity WHERE subject = 'tester-1'`)
      expect(identity?.provider_id).toBe(providerId)
    })

    test('logs in a linked identity even if its email changed at the provider', async () => {
      const { location } = await runFlow({
        claims: { sub: 'tester-1', email: `changed@${testEmailDomain}`, email_verified: false },
      })
      expect(location).toBe('/app/home/')
    })

    test('matches Gmail address variants', async () => {
      await insertUser({ email: gmailUserEmail, status: UserStatus.ACCEPTED, withPassword: true })
      const { location } = await runFlow({
        claims: { sub: 'gmail-1', email: 'extlogintester+arena@googlemail.com', email_verified: true },
      })
      expect(location).toBe('/app/home/')
    })

    test('refuses emails outside the allowed domains', async () => {
      await getAuthProviderService().update({ id: providerId, props: { allowedEmailDomains: ['example.org'] } })
      try {
        const { location } = await runFlow({ claims: { sub: 'tester-1', email: mockUser.email, email_verified: true } })
        expect(getErrorKey(location)).toBe(ExternalLoginErrorKeys.emailDomainNotAllowed)
      } finally {
        await getAuthProviderService().update({ id: providerId, props: { allowedEmailDomains: [] } })
      }
    })

    test('accepts an invitation with a provider account having another email', async () => {
      const userUuid = await insertUser({ email: invitedEmail, status: UserStatus.INVITED })
      const invitationUuid: string = await DB.one(
        `INSERT INTO user_reset_password (user_uuid) VALUES ($1) RETURNING uuid`,
        [userUuid],
        (row) => row.uuid
      )
      const { location } = await runFlow({
        claims: { sub: 'invited-1', email: 'someone.else@example.com', email_verified: true },
        query: { invitation: invitationUuid, name: 'Invited User' },
      })
      expect(location).toBe('/app/home/')
      const user = await DB.one(`SELECT name, status, password FROM "user" WHERE uuid = $1`, [userUuid])
      expect(user).toEqual({ name: 'Invited User', status: UserStatus.ACCEPTED, password: null })
      const invitations = await DB.any(`SELECT * FROM user_reset_password WHERE user_uuid = $1`, [userUuid])
      expect(invitations).toHaveLength(0)
    })

    test('refuses an invalid invitation', async () => {
      const { location } = await runFlow({
        claims: { sub: 'invited-2', email: invitedEmail, email_verified: true },
        query: { invitation: '00000000-0000-4000-8000-000000000000' },
      })
      expect(location).toContain('/guest/resetPassword/00000000-0000-4000-8000-000000000000/')
      expect(getErrorKey(location)).toBe(ExternalLoginErrorKeys.invitationInvalid)
    })

    test('refuses a callback without the flow cookie', async () => {
      const res = await globalThis.api
        .getRaw(`${ApiEndpoint.auth.externalLoginCallback(providerId)}?code=abc&state=xyz`)
        .expect(302)
      expect(getErrorKey(res.headers.location)).toBe(ExternalLoginErrorKeys.flowInvalid)
    })

    test('links an identity to the logged-in user', async () => {
      await globalThis.api.login()
      const { body } = await globalThis.api
        .post(ApiEndpoint.auth.externalLoginTicket(providerId))
        .send({ mode: 'link' })
        .expect(200)
      // the user already has an identity of this provider: another one cannot be linked
      const { location } = await runFlow({
        claims: { sub: 'tester-2', email: mockUser.email, email_verified: true },
        query: { ticket: body.ticket, returnTo: '/app/users/profile' },
      })
      expect(location.startsWith('/app/users/profile?')).toBe(true)
      expect(getErrorKey(location)).toBe(ExternalLoginErrorKeys.providerAlreadyLinked)
    })

    test('does not unlink the last sign-in method', async () => {
      const userUuid: string = await DB.one(`SELECT uuid FROM "user" WHERE email = $1`, [invitedEmail], (r) => r.uuid)
      const [identity] = await getAuthProviderService().getUserIdentities(userUuid)
      await expect(getAuthProviderService().unlinkUserIdentity({ userUuid, identityId: identity.id })).rejects.toThrow(
        'appErrors.authProvider.lastSignInMethod'
      )
    })

    test('requires Arena 2FA when enabled for the provider and the user', async () => {
      await getAuthProviderService().update({ id: providerId, props: { requireArena2FA: true } })
      const userUuid: string = await DB.one(`SELECT uuid FROM "user" WHERE email = $1`, [mockUser.email], (r) => r.uuid)
      const device = await User2FAServiceServer.addDevice({
        userUuid,
        userEmail: mockUser.email,
        deviceName: 'external login test',
      })
      await User2FADeviceRepository.update({ uuid: device.uuid, enabled: true })
      try {
        const { location, callbackRes } = await runFlow({
          claims: { sub: 'tester-1', email: mockUser.email, email_verified: true },
        })
        expect(location).toContain('externalLoginStep=2fa')
        expect(getCookie(callbackRes, 'refreshToken')).toBeUndefined()
        const pendingCookie = getCookie(callbackRes, 'externalLoginPending2FA')
        await globalThis.api
          .post(ApiEndpoint.auth.externalLoginTwoFactor())
          .set('Cookie', pendingCookie!)
          .send({ twoFactorToken: '000000' })
          .expect(401)
        const { body } = await globalThis.api
          .post(ApiEndpoint.auth.externalLoginTwoFactor())
          .set('Cookie', pendingCookie!)
          .send({ twoFactorToken: generateSync({ secret: device.secret }) })
          .expect(200)
        expect(body.authToken).toBeDefined()
        expect(body.user.email).toBe(mockUser.email)
      } finally {
        await DB.none(`DELETE FROM user_2fa_device WHERE device_name = 'external login test'`)
        await getAuthProviderService().update({ id: providerId, props: { requireArena2FA: false } })
      }
    })
  })

export default externalLoginTests
