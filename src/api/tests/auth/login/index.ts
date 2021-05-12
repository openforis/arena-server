import { User } from '@openforis/arena-core'
import { AuthGroupName } from '@openforis/arena-core/dist/auth/authGroup'

import { ApiEndpoint } from '../../../endpoint'
import { mockUser, mockUserInvalid } from '../../mock/user'

export default (): void =>
  describe(`Login ${ApiEndpoint.auth.login()}`, () => {
    test('Login fail', async () => {
      const { body, status } = await global.api.post(ApiEndpoint.auth.login()).send(mockUserInvalid).expect(401)

      const message: string = body.message
      expect(status).toBe(401)
      expect(message).toBe('Missing credentials')
    })

    test('Login success', async () => {
      const { body } = await global.api.post(ApiEndpoint.auth.login()).send(mockUser).expect(200)

      const user: User = body.user
      expect(user).toBeDefined()
      expect(user.uuid).toBeDefined()
      expect(body.survey).not.toBeDefined() // only with param
      expect(user.email).toBe(mockUser.email)
      expect(user.authGroups?.length).toBe(1)
      expect(user.authGroups?.[0].name).toBe(AuthGroupName.systemAdmin)
    })

    test('Login success with surveyId', async () => {
      const { body, headers } = await global.api
        .post(ApiEndpoint.auth.login('includeSurvey'))
        .send(mockUser)
        .expect(200)
      expect(body.survey).toBeDefined()
      expect(headers).toBeDefined()
      expect(headers['set-cookie']).toBeDefined()

      // Save cookie for tests
      global.api.cookie = headers['set-cookie']
    })
  })
