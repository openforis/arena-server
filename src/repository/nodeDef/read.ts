import { Objects, Strings } from '@openforis/arena-core'
import type { NodeDefPropsAdvanced } from '@openforis/arena-core'
import { DB, DBs, Schemata } from '../../db'

const nodeDefSelectFields = `id, uuid, parent_uuid, type, deleted, analysis, virtual, 
  ${DBs.selectDate('date_created')}, ${DBs.selectDate('date_modified')}, 
  props, props_advanced, props_draft, props_advanced_draft, meta`

// advanced properties to track as draft (to be used when publishing record)
const advancedPropKeysDraftToTrack = [
  'applicable',
  'defaultValues',
  'fileNameExpression',
  'validations',
] as const satisfies ReadonlyArray<keyof NodeDefPropsAdvanced>

const rowPropertyByAdvancedPropKeys: Record<(typeof advancedPropKeysDraftToTrack)[number], string> =
  advancedPropKeysDraftToTrack.reduce(
    (acc, advancedPropKey) => {
      acc[advancedPropKey] = Strings.camelCase(`draftAdvanced_${advancedPropKey}`)
      return acc
    },
    {} as Record<(typeof advancedPropKeysDraftToTrack)[number], string>
  )

const rowTransformCallback =
  ({ draft, advanced = false, backup = false }: { draft?: boolean; advanced?: boolean; backup?: boolean }) =>
  (row: any): any => {
    const rowUpdated = { ...row }

    if (advanced || backup) {
      if (!Objects.isEmpty(rowUpdated.props_advanced_draft)) {
        // there are draft advanced props to merge with "published" advanced props
        rowUpdated[Strings.camelCase('draftAdvanced')] = true

        // set updated props flags
        advancedPropKeysDraftToTrack.forEach((advancedPropKey) => {
          if (rowUpdated.props_advanced_draft[advancedPropKey]) {
            rowUpdated[rowPropertyByAdvancedPropKeys[advancedPropKey]] = true
          }
        })

        if (draft && !backup) {
          // merge props_advanced and props_advanced_draft into props_advanced
          rowUpdated.props_advanced = {
            ...row.props_advanced,
            ...row.props_advanced_draft,
          }
          delete rowUpdated.props_advanced_draft
        }
      }
      if ((!backup && !draft) || Objects.isEmpty(rowUpdated.props_advanced_draft)) {
        // ignore props_advanced_draft
        delete rowUpdated.props_advanced_draft
      }
    } else {
      delete rowUpdated.props_advanced
      delete rowUpdated.props_advanced_draft
    }
    return DBs.transformCallback({ row: rowUpdated, draft, assocPublishedDraft: true, backup })
  }

export type NodeDefinitionFetchParams = {
  surveyId: number
  cycle?: string
  draft?: boolean
  advanced?: boolean
  includeDeleted?: boolean
  backup?: boolean
  includeAnalysis?: boolean
}

export const getNodeDefsBySurveyId = async (params: NodeDefinitionFetchParams, client = DB) => {
  const { surveyId, cycle, draft, includeDeleted = false, backup = false, includeAnalysis = true } = params

  return client.map(
    `
    SELECT ${nodeDefSelectFields}
    FROM ${Schemata.getSchemaSurvey(surveyId)}.node_def 
    WHERE TRUE
      ${
        cycle
          ? `--filter by cycle
          AND ${DBs.getPropColCombined('cycles', { draft, asText: false })} @> $1`
          : ''
      } 
      ${!backup && !draft ? " AND props <> '{}'::jsonb" : ''}
      ${!includeDeleted ? ' AND deleted IS NOT TRUE' : ''}
      ${!includeAnalysis ? ' AND analysis IS NOT TRUE' : ''}
    ORDER BY id`,
    [JSON.stringify(cycle || null)],
    rowTransformCallback(params)
  )
}
