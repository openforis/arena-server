import { getNodeDefsBySurveyId, rowTransformCallback } from './read'

export type { NodeDefinitionFetchParams } from './read'

export const NodeDefRepository = {
  getNodeDefsBySurveyId,
  rowTransformCallback,
}
