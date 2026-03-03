import { ApiEndpoint } from '../../../api/endpoint'
import { ArenaServerConstants } from '../../../model'
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
      expect(body.appInfo.appId).toBe(ArenaServerConstants.appId)
      expect(body.appInfo.version).toBe(ProcessEnv.applicationVersion)
      expect(body.config.fileUploadLimit).toBe(ProcessEnv.fileUploadLimit)
      expect(body.config.experimentalFeatures).toBe(ProcessEnv.experimentalFeatures)
    })
  })

export default initInfoApiTests
