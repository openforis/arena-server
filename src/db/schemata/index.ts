const getSchemaSurvey = (surveyId: number): string => `survey_${surveyId}`
const getSchemaSurveyRdb = (surveyId: number): string => `${getSchemaSurvey(surveyId)}_data`

export const Schemata = {
  PUBLIC: 'public',
  getSchemaSurvey,
  getSchemaSurveyRdb,
}
