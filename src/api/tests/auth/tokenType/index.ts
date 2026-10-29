import { UserAuthRefreshTokenProps } from '@openforis/arena-core'

import { UserAuthTokenServiceServer } from '../../../../service/userAuthToken'
import { ApiEndpoint } from '../../../endpoint'
import { mockUser } from '../../mock/user'
import { ApiTest } from '../../utils/apiTest'

declare global {
  var api: ApiTest
}

const tokenTypeTests = (): void =>
  describe('Bearer token type', () => {
    const getInfoWithToken = (token: string) =>
      globalThis.api.get(ApiEndpoint.info.info()).set('Authorization', `Bearer ${token}`)

    const loginAndGetUserUuid = async (): Promise<string> => {
      const { body } = await globalThis.api.post(ApiEndpoint.auth.login()).send(mockUser).expect(200)
      return body.user.uuid
    }

    test('Access token is accepted', async () => {
      const userUuid = await loginAndGetUserUuid()
      const { authToken } = await UserAuthTokenServiceServer.createUserAuthTokens({
        userUuid,
        props: { userAgent: 'test' } as UserAuthRefreshTokenProps,
      })
      await getInfoWithToken(authToken.token).expect(200)
    })

    test('Refresh token is rejected', async () => {
      const userUuid = await loginAndGetUserUuid()
      const { refreshToken } = await UserAuthTokenServiceServer.createUserAuthTokens({
        userUuid,
        props: { userAgent: 'test' } as UserAuthRefreshTokenProps,
      })
      await getInfoWithToken(refreshToken.token).expect(401)
    })

    test('Download token is rejected', async () => {
      const userUuid = await loginAndGetUserUuid()
      const downloadToken = UserAuthTokenServiceServer.createDownloadAuthToken({ userUuid, fileName: 'file.zip' })
      await getInfoWithToken(downloadToken.token).expect(401)
    })
  })

export default tokenTypeTests
