import { getApiPathSurvey } from './common'

export const dataQuery = {
  dataQueriesCount: (surveyId: string): string => getApiPathSurvey(surveyId, 'data_queries', 'count'),
  dataQueries: (surveyId: string): string => getApiPathSurvey(surveyId, 'data_queries'),
  dataQuery: (surveyId: string, queryUuid: string): string => getApiPathSurvey(surveyId, 'data_query', queryUuid),
}
