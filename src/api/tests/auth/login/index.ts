import { User } from '@openforis/arena-core'

import { ApiEndpoint } from '../../../endpoint'
import { mockUser, mockUserInvalid } from '../../mock/user'

export default (): void =>
  describe(`Login ${ApiEndpoint.auth.login()}`, () => {
    test('Login success', async () => {
      const { body } = await global.api.post(ApiEndpoint.auth.login()).send(mockUser).expect(200)

      const user: User = body.user
      expect(user).toBeDefined()
      expect(user.uuid).toBeDefined()
      expect(user.email).toBe(mockUser.email)
    })

    test('Login fail', async () => {
      const { body, status } = await global.api.post(ApiEndpoint.auth.login()).send(mockUserInvalid).expect(401)

      const message: string = body.message
      expect(status).toBe(401)
      expect(message).toBe('Missing credentials')
    })
  })
