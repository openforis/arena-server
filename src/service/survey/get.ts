import { NodeDefsFixer, Survey, Surveys } from '@openforis/arena-core'

import { NodeDefMap } from '@openforis/arena-core/dist/nodeDef'
import { Logger } from '../../log'
import { SurveyRepository } from '../../repository'
import type { NodeDefinitionFetchParams } from '../../repository/nodeDef'
import { NodeDefRepository } from '../../repository/nodeDef'
import { DB } from '../../db'

const logger = new Logger('SurveyService.get')

export interface SurveyGetOptions {
  surveyId: number
  draft?: boolean
  backup?: boolean
  cycle?: string
  nodeDefOptions?: Omit<NodeDefinitionFetchParams, 'surveyId'> // nodeDefOptions are used to fetch node defs to be associated to the survey, if not provided node defs won't be fetched and associated
}

export const get = async (options: SurveyGetOptions, client = DB): Promise<Survey> => {
  const { nodeDefOptions, ...repoOptions } = options
  const { backup } = repoOptions

  const survey = await SurveyRepository.get(repoOptions, client)
  const surveyId = survey.id!

  const surveyCycles = Surveys.getCycleKeys(
    backup ? { ...survey, props: { ...survey.props, ...survey.propsDraft } } : survey
  )

  if (!nodeDefOptions) {
    return survey
  }
  const nodeDefsArray = await NodeDefRepository.getNodeDefsBySurveyId({ surveyId, ...nodeDefOptions }, client)

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
