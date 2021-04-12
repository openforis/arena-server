import { getApiPathSurvey } from './common'

export const chain = {
  chainsCount: (surveyId: string): string => getApiPathSurvey(surveyId, 'chains', 'count'),
  chains: (surveyId: string): string => getApiPathSurvey(surveyId, 'chains'),
  chain: (surveyId: string, chainUuid: string): string => getApiPathSurvey(surveyId, 'chain', chainUuid),
}
