import { SurveyFactory, LanguageCode } from '@openforis/arena-core'

export const mockSurvey = SurveyFactory.createInstance({
  ownerUuid: 'uuid-0001-test',
  name: 'test_survey',
  languages: [LanguageCode.en, LanguageCode.es],
})
