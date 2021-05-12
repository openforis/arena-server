import { ApiEndpoint } from '../../../endpoint'
import { mockSurvey } from '../../mock/survey'

export default (): void =>
  describe(`Survey ${ApiEndpoint.survey.create()}`, () => {
    test('Create success', async () => {
      const { body } = await global.api.post(ApiEndpoint.survey.create()).send(mockSurvey).expect(200)
      expect(body).toBe(1)
    })
  })
