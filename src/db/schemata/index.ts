const getSchemaSurvey = (surveyId: number): string => {
  // surveyId often comes straight from a request param: it ends up unquoted in SQL, so it must be a plain integer
  if (!/^\d+$/.test(String(surveyId))) throw new Error(`invalid survey id: ${surveyId}`)
  return `survey_${surveyId}`
}
const getSchemaSurveyRdb = (surveyId: number): string => `${getSchemaSurvey(surveyId)}_data`

export const Schemata = {
  PUBLIC: 'public',
  getSchemaSurvey,
  getSchemaSurveyRdb,
}
