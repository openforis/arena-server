import { Dictionary, NodeDef, NodeDefType, Survey, Surveys } from '@openforis/arena-core'

import type { NodeDefinitionFetchParams } from '../../repository/nodeDef'
import { NodeDefRepository } from '../../repository/nodeDef'
import { SurveyRepository } from '../../repository'

export interface SurveyGetOptions {
  surveyId: number
  draft?: boolean
  backup?: boolean
  cycle?: string
  nodeDefOptions?: Pick<NodeDefinitionFetchParams, 'advanced' | 'includeDeleted' | 'backup' | 'includeAnalysis'>
}

export const get = async (options: SurveyGetOptions): Promise<Survey> => {
  const { cycle, nodeDefOptions, ...repoOptions } = options
  const { draft } = repoOptions
  const { advanced = false } = nodeDefOptions ?? {}

  const survey = await SurveyRepository.get(repoOptions)
  const surveyId = survey.id
  if (surveyId == null) return survey

  const nodeDefs = await NodeDefRepository.getNodeDefsBySurveyId({
    surveyId,
    draft,
    cycle,
    advanced,
  })
  const nodeDefsDictionary = {} as Dictionary<NodeDef<NodeDefType>>
  for (const nodeDef of nodeDefs) {
    nodeDefsDictionary[nodeDef.uuid] = nodeDef
  }
  survey.nodeDefs = nodeDefsDictionary
  Surveys.buildAndAssocNodeDefsIndex(survey)

  return survey
}
