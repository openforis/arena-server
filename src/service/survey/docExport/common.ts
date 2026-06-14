import {
  Node as ArenaNode,
  CategoryItem,
  CategoryItems,
  LanguageCode,
  NodeDef,
  NodeDefBoolean,
  NodeDefCoordinate,
  NodeDefEntity,
  NodeDefEntityRenderType,
  NodeDefs,
  NodeDefType,
  Nodes,
  NodeValueFormatter,
  NodeValues,
  Objects,
  Strings,
  Taxa,
} from '@openforis/arena-core'

import type { RenderContext } from './types'

export const EMPTY_FIELD = '________________________________'
export const EMPTY_SHORT = '___________'

export const label = (nodeDef: NodeDef<NodeDefType>, lang: LanguageCode): string =>
  NodeDefs.getLabelOrName(nodeDef, lang)

export const getCategoryItemLabel = (item: CategoryItem, lang: LanguageCode): string => {
  const itemLabel = CategoryItems.getLabel(item, lang)
  return Objects.isEmpty(itemLabel) ? CategoryItems.getCode(item) : itemLabel
}

export const getCommonLabel = (context: RenderContext, key: string, fallback: string): string => {
  const translationKey = `common.${key}`
  return context.i18n?.exists(translationKey) ? context.i18n.t(translationKey) : fallback
}

export const getBooleanValueLabel = (context: RenderContext, nodeDef: NodeDefBoolean, value: boolean): string => {
  const labelType = nodeDef.props.labelValue
  if (labelType === 'trueFalse') {
    return value ? getCommonLabel(context, 'true', 'True') : getCommonLabel(context, 'false', 'False')
  }
  return value ? getCommonLabel(context, 'yes', 'Yes') : getCommonLabel(context, 'no', 'No')
}

export const formatNodeValue = (nodeDef: NodeDef<NodeDefType>, context: RenderContext, node: ArenaNode): string => {
  if (Nodes.isValueBlank(node)) return ''
  const { survey, lang, cycle } = context
  switch (nodeDef.type) {
    case NodeDefType.boolean: {
      const boolDef = nodeDef as NodeDefBoolean
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
      return NodeValues.getFileName(node) ?? ''
    case NodeDefType.code: {
      const refItem = node.refData?.categoryItem
      if (refItem) return getCategoryItemLabel(refItem, lang)
      return NodeValues.getValueCode(node.value) ?? ''
    }
    default: {
      const formatted = NodeValueFormatter.format({
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

export const getValueFields = (nodeDef: NodeDefCoordinate): string[] => [
  NodeValues.ValuePropsCoordinate.srs,
  NodeValues.ValuePropsCoordinate.x,
  NodeValues.ValuePropsCoordinate.y,
  ...NodeDefs.getCoordinateAdditionalFields(nodeDef),
]

export const getCoordinateLabelByField = (
  nodeDef: NodeDefCoordinate,
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

export const isNodeBlank = (node?: ArenaNode): boolean => !node || Nodes.isValueBlank(node)

export const isNodeFilled = (node?: ArenaNode): node is ArenaNode => !isNodeBlank(node)

export const getIsTableLayout = (entityDef: NodeDefEntity, cycle: string): boolean =>
  NodeDefs.getLayoutRenderType(cycle)(entityDef) === NodeDefEntityRenderType.table
