import { getApiPathSurvey } from './common'

const moduleName = 'data_queries'

export const dataQuery = {
  dataQueriesCount: (surveyId: string): string => getApiPathSurvey(surveyId, moduleName, 'count'),
  dataQueries: (surveyId: string): string => getApiPathSurvey(surveyId, moduleName),
  dataQuery: (surveyId: string, queryUuid: string): string => getApiPathSurvey(surveyId, moduleName, queryUuid),
}
