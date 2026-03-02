import { ApiEndpoint } from '../../../api/endpoint'
import { ProcessEnv } from '../../../processEnv'
import { ApiTest } from '../utils/apiTest'

declare global {
  var api: ApiTest
}

export default (): void =>
  describe(`Info ${ApiEndpoint.info.info()}`, () => {
    test('Get app info', async () => {
      const { body } = await globalThis.api.get(ApiEndpoint.info.info()).expect(200)

      expect(body.info).toBeDefined()
      expect(body.info.applicationVersion).toBe(ProcessEnv.applicationVersion)
      expect(body.info.fileUploadLimit).toBe(ProcessEnv.fileUploadLimit)
    })
  })
