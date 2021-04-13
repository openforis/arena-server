export const getApiPath = (...paths: Array<string>): string => `/api/${paths.join('/')}/`

export const getApiPathSurvey = (surveyId: string, ...paths: Array<string>): string =>
  getApiPath('survey', surveyId, ...paths)
