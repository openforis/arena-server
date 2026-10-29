import { Schemata } from '..'

describe('Schemata', () => {
  test('builds survey schema names from integer ids', () => {
    expect(Schemata.getSchemaSurvey(12)).toBe('survey_12')
    expect(Schemata.getSchemaSurvey('12' as unknown as number)).toBe('survey_12')
    expect(Schemata.getSchemaSurveyRdb(12)).toBe('survey_12_data')
  })

  test('rejects survey ids that are not plain integers', () => {
    for (const surveyId of ['1; DROP TABLE "user"', '1.data_query', '-1', '', 'abc']) {
      expect(() => Schemata.getSchemaSurvey(surveyId as unknown as number)).toThrow('invalid survey id')
    }
  })
})
