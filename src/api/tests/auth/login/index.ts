import { ServiceRegistry, User, UserFactory } from '@openforis/arena-core'
import { AuthGroupName } from '@openforis/arena-core/dist/auth/authGroup'

import { DB } from '../../../../db'
import { ApiEndpoint } from '../../../endpoint'
import { ServerServiceType } from '../../../../server'
import { SurveyDataMigrationServiceServer } from '../../../../service'
import { mockUser, mockUserInvalid } from '../../mock/user'
import { ApiTest } from '../../utils/apiTest'
import { passwordEncrypted } from '../../utils/insertTestUser'

declare global {
  var api: ApiTest
}

const userWithoutRoles: User = {
  ...UserFactory.createInstance({ email: 'test-no-roles@openforis-arena.org', name: 'Tester without roles' }),
  password: 'Test_123',
}

// inserts a survey (owned by the test system admin) and sets it as current survey of a user without roles in it
const insertSurveyAsCurrentOfUserWithoutRoles = (): Promise<number> =>
  DB.tx(async (tx) => {
    const { id } = await tx.one(
      `INSERT INTO survey (owner_uuid, props_draft)
       SELECT uuid, '{"name": "login_test_survey"}'::jsonb FROM "user" WHERE email = $1
       RETURNING id`,
      [mockUser.email]
    )
    const surveyId = Number(id)
    const prefs = { surveys: { current: surveyId, [surveyId]: { cycle: '0' } } }
    await tx.none(
      `INSERT INTO "user" (name, email, password, status, prefs)
       VALUES ($1, $2, $3, 'ACCEPTED', $4::jsonb)
       ON CONFLICT (email) DO UPDATE SET prefs = EXCLUDED.prefs`,
      [userWithoutRoles.name, userWithoutRoles.email, passwordEncrypted, prefs]
    )
    return surveyId
  })

const loginTests = (): void =>
  describe(`Login ${ApiEndpoint.auth.login()}`, () => {
    test('Login success', async () => {
      const { body } = await globalThis.api.post(ApiEndpoint.auth.login()).send(mockUser).expect(200)

      const user: User = body.user
      expect(user).toBeDefined()
      expect(user.uuid).toBeDefined()
      expect(body.survey).not.toBeDefined() // only with param
      expect(user.email).toBe(mockUser.email)
      expect(user.authGroups?.length).toBe(1)
      expect(user.authGroups?.[0].name).toBe(AuthGroupName.systemAdmin)
    })

    test('Login success with surveyId', async () => {
      const { body } = await globalThis.api
        .post(ApiEndpoint.auth.login({ includeSurvey: true }))
        .send(mockUser)
        .expect(200)
      expect(body.survey).toBeDefined()
    })

    test('Login with surveyId does not return a current survey the user cannot view', async () => {
      const surveyId = await insertSurveyAsCurrentOfUserWithoutRoles()
      try {
        const { body } = await globalThis.api
          .post(ApiEndpoint.auth.login({ includeSurvey: true }))
          .send(userWithoutRoles)
          .expect(200)
        expect(body.survey).not.toBeDefined()
        // the survey pref is removed
        expect(body.user.prefs?.surveys?.[surveyId]).not.toBeDefined()
      } finally {
        await DB.none('DELETE FROM survey WHERE id = $1', [surveyId])
      }
    })

    test('Login with surveyId keeps the current survey pref while its data migration is pending', async () => {
      const surveyId = await insertSurveyAsCurrentOfUserWithoutRoles()
      const serviceRegistry = ServiceRegistry.getInstance()
      serviceRegistry.registerService(ServerServiceType.surveyDataMigration, {
        isPending: async ({ surveyId: surveyIdParam }: { surveyId: number }) => surveyIdParam === surveyId,
      })
      try {
        const { body } = await globalThis.api
          .post(ApiEndpoint.auth.login({ includeSurvey: true }))
          .send(userWithoutRoles)
          .expect(200)
        expect(body.survey).not.toBeDefined()
        // the survey pref is kept
        expect(body.user.prefs?.surveys?.current).toBe(surveyId)
        expect(body.user.prefs?.surveys?.[surveyId]).toBeDefined()
      } finally {
        serviceRegistry.registerService(ServerServiceType.surveyDataMigration, SurveyDataMigrationServiceServer)
        await DB.none('DELETE FROM survey WHERE id = $1', [surveyId])
      }
    })

    test('Login fail', async () => {
      const { body, status } = await globalThis.api.post(ApiEndpoint.auth.login()).send(mockUserInvalid).expect(401)

      const message: string = body.message
      expect(status).toBe(401)
      expect(message).toBe('Missing credentials')
    })
  })

export default loginTests
