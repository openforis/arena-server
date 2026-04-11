import { getApiPathSurvey } from './common'

export const survey = {
  docxExport: (surveyId = ':surveyId'): string => getApiPathSurvey(surveyId, 'docx-export'),
}
