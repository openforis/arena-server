import { ApiEndpoint } from '../../../api/endpoint'
import { ProcessEnv } from '../../../processEnv'
import { ApiTest } from '../utils/apiTest'

declare global {
  var api: ApiTest
}

const initInfoApiTests = (): void =>
  describe(`Info ${ApiEndpoint.info.info()}`, () => {
    test('Get app info', async () => {
      const { body } = await globalThis.api.get(ApiEndpoint.info.info()).expect(200)

      expect(body).toBeDefined()
      expect(body.applicationVersion).toBe(ProcessEnv.applicationVersion)
      expect(body.fileUploadLimit).toBe(ProcessEnv.fileUploadLimit)
      expect(body.experimentalFeatures).toBe(ProcessEnv.experimentalFeatures)
    })
  })

export default initInfoApiTests
