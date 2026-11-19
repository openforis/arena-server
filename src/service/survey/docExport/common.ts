import {
  ArenaRecordNode as ArenaNode,
  ArenaCategoryItem,
  CategoryItems,
  LanguageCode,
  ArenaNodeDef,
  ArenaNodeDefBoolean,
  ArenaNodeDefCoordinate,
  ArenaNodeDefEntity,
  NodeDefEntityRenderType,
  NodeDefs,
  NodeDefType,
  RecordNodes,
  RecordNodeValueFormatter,
  RecordNodeValues,
  Objects,
  Strings,
  Taxa,
} from '@openforis/arena-core'

import type { RenderContext } from './types'

export const EMPTY_FIELD = '________________________________'
export const EMPTY_SHORT = '___________'

export const label = (nodeDef: ArenaNodeDef<NodeDefType>, lang: LanguageCode): string =>
  NodeDefs.getLabelOrName(nodeDef, lang)

export const getCategoryItemLabel = (item: ArenaCategoryItem, lang: LanguageCode): string => {
  const itemLabel = CategoryItems.getLabel(item, lang)
  return Objects.isEmpty(itemLabel) ? CategoryItems.getCode(item) : itemLabel
}

export const getCommonLabel = (context: RenderContext, key: string, fallback: string): string => {
  const translationKey = `common.${key}`
  return context.i18n?.exists(translationKey) ? context.i18n.t(translationKey) : fallback
}

export const getBooleanValueLabel = (context: RenderContext, nodeDef: ArenaNodeDefBoolean, value: boolean): string => {
  const labelType = nodeDef.props.labelValue
  if (labelType === 'trueFalse') {
    return value ? getCommonLabel(context, 'true', 'True') : getCommonLabel(context, 'false', 'False')
  }
  return value ? getCommonLabel(context, 'yes', 'Yes') : getCommonLabel(context, 'no', 'No')
}

export const formatNodeValue = (
  nodeDef: ArenaNodeDef<NodeDefType>,
  context: RenderContext,
  node: ArenaNode
): string => {
  if (RecordNodes.isValueBlank(node)) return ''
  const { survey, lang, cycle } = context
  switch (nodeDef.type) {
    case NodeDefType.boolean: {
      const boolDef = nodeDef as ArenaNodeDefBoolean
      return getBooleanValueLabel(context, boolDef, node.value === true || node.value === 'true')
    }
    case NodeDefType.taxon: {
      const taxon = node.refData?.taxon
      if (!taxon) return ''
      const code = Taxa.getCode(taxon)
      const sciName = Taxa.getScientificName(taxon)
      return `${sciName} (${code})`
    }
    case NodeDefType.file:
      return RecordNodeValues.getFileName(node) ?? ''
    case NodeDefType.code: {
      const refItem = node.refData?.categoryItem
      if (refItem) return getCategoryItemLabel(refItem, lang)
      return RecordNodeValues.getValueCode(node.value) ?? ''
    }
    default: {
      const formatted = RecordNodeValueFormatter.format({
        survey,
        cycle,
        nodeDef,
        node,
        value: node.value,
        lang,
        showLabel: true,
      })
      return Objects.isNil(formatted) ? '' : String(formatted)
    }
  }
}

export const getValueFields = (nodeDef: ArenaNodeDefCoordinate): string[] => [
  RecordNodeValues.ValuePropsCoordinate.srs,
  RecordNodeValues.ValuePropsCoordinate.x,
  RecordNodeValues.ValuePropsCoordinate.y,
  ...NodeDefs.getCoordinateAdditionalFields(nodeDef),
]

export const getCoordinateLabelByField = (
  nodeDef: ArenaNodeDefCoordinate,
  context: RenderContext
): Record<string, string> => {
  const valueFields = getValueFields(nodeDef)
  const labelByField = valueFields.reduce(
    (acc, field) => {
      const labelKey = `surveyForm:nodeDefCoordinate.${field}`
      const fieldLabel = context.i18n.exists(labelKey) ? context.i18n.t(labelKey) : field
      acc[field] = fieldLabel
      return acc
    },
    {} as Record<string, string>
  )

  const maxLabelLength = Math.max(...valueFields.map((f) => labelByField[f].length))
  for (const field of valueFields) {
    const fieldLabel = labelByField[field]
    if (fieldLabel.length < maxLabelLength) {
      labelByField[field] = Strings.padStart(maxLabelLength, ' ')(fieldLabel)
    }
  }
  return labelByField
}

export const isNodeBlank = (node?: ArenaNode): boolean => !node || RecordNodes.isValueBlank(node)

export const isNodeFilled = (node?: ArenaNode): node is ArenaNode => !isNodeBlank(node)

export const getIsTableLayout = (entityDef: ArenaNodeDefEntity, cycle: string): boolean =>
  NodeDefs.getLayoutRenderType(cycle)(entityDef) === NodeDefEntityRenderType.table
