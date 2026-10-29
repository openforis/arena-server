import { ApiEndpoint } from '../../endpoint'
import { ApiTest } from '../utils/apiTest'

declare global {
  var api: ApiTest
}

const dataQueryApiTests = (): void =>
  describe(`Data queries ${ApiEndpoint.dataQuery.dataQueries(':surveyId')}`, () => {
    test('Rejects a survey id that is not an integer', async () => {
      await globalThis.api.login()

      const surveyId = encodeURIComponent('1.data_query; SELECT 1; --')
      const { status } = await globalThis.api.get(ApiEndpoint.dataQuery.dataQueries(surveyId))

      expect(status).toBeGreaterThanOrEqual(400)
    })
  })

export default dataQueryApiTests
