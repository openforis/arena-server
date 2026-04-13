import { NodeDefsFixer, Survey, Surveys } from '@openforis/arena-core'

import { NodeDefMap } from '@openforis/arena-core/dist/nodeDef'
import { Logger } from '../../log'
import { SurveyRepository } from '../../repository'
import type { NodeDefinitionFetchParams } from '../../repository/nodeDef'
import { NodeDefRepository } from '../../repository/nodeDef'

const logger = new Logger('SurveyService.get')

export interface SurveyGetOptions {
  surveyId: number
  draft?: boolean
  backup?: boolean
  cycle?: string
  nodeDefOptions?: Pick<NodeDefinitionFetchParams, 'advanced' | 'includeDeleted' | 'backup' | 'includeAnalysis'>
}

export const get = async (options: SurveyGetOptions): Promise<Survey> => {
  const { cycle, backup, nodeDefOptions, ...repoOptions } = options
  const { draft } = repoOptions
  const { advanced = false } = nodeDefOptions ?? {}

  const survey = await SurveyRepository.get(repoOptions)
  const surveyId = survey.id
  if (surveyId == null) return survey

  const surveyCycles = Surveys.getCycleKeys(
    backup ? { ...survey, props: { ...survey.props, ...survey.propsDraft } } : survey
  )

  const nodeDefsArray = await NodeDefRepository.getNodeDefsBySurveyId({
    surveyId,
    draft,
    cycle,
    advanced,
  })

  const nodeDefsDictionary: NodeDefMap = {}
  for (const nodeDef of nodeDefsArray) {
    nodeDefsDictionary[nodeDef.uuid] = nodeDef
  }

  const { nodeDefs: nodeDefsFixed, updatedNodeDefs } = NodeDefsFixer.fixNodeDefs({
    nodeDefs: nodeDefsDictionary,
    cycles: surveyCycles,
    sideEffect: true,
  })
  const updatedNodeDefsCount = Object.values(updatedNodeDefs).length
  if (updatedNodeDefsCount) {
    logger.debug(`Survey ${surveyId} has broken node defs (${updatedNodeDefsCount} has been fixed)`)
  }

  survey.nodeDefs = nodeDefsFixed
  Surveys.buildAndAssocNodeDefsIndex(survey)

  return survey
}
