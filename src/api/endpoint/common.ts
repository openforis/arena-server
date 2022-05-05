export const getPath = (...pathParts: Array<string>): string => `/${pathParts.join('/')}/`

export const getApiPath = (...pathParts: Array<string>): string => getPath('api', ...pathParts)

export const getApiPathSurvey = (surveyId: string, ...paths: Array<string>): string =>
  getApiPath('survey', surveyId, ...paths)
