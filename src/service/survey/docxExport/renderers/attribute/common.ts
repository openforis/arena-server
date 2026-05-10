import { CheckBox, HeadingLevel, Paragraph, TextRun, type IParagraphOptions } from 'docx'

import type {
  CategoryItem,
  LanguageCode,
  Node as ArenaNode,
  NodeDef,
  NodeDefBoolean,
  NodeDefCoordinate,
  NodeDefEntity,
} from '@openforis/arena-core'
import {
  CategoryItems,
  NodeDefType,
  NodeDefs,
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
export const SPACING_FIELD_ROW = { before: 80, after: 80 }
export const SPACING_COMPOSITE_LABEL_ROW = { before: 80, after: 40 }

export const label = (nodeDef: NodeDef<NodeDefType>, lang: LanguageCode): string =>
  NodeDefs.getLabelOrName(nodeDef, lang)

export const formItemLabelRun = (labelText: string, trailingSpace = true): TextRun =>
  new TextRun({ text: `${labelText}:${trailingSpace ? ' ' : ''}`, bold: true })

export const nodeDefFormItemLabelRun = (nodeDef: NodeDef<NodeDefType>, context: RenderContext): TextRun =>
  formItemLabelRun(label(nodeDef, context.lang))

export const inputLine = (text: string): TextRun => new TextRun({ text, underline: {} })

export const fieldRow = (fieldLabel: string, fieldPlaceholder = EMPTY_FIELD): Paragraph =>
  new Paragraph({
    spacing: SPACING_FIELD_ROW,
    children: [formItemLabelRun(fieldLabel), inputLine(fieldPlaceholder)],
  })

export const valueRow = (fieldLabel: string, value: string): Paragraph =>
  new Paragraph({
    spacing: SPACING_FIELD_ROW,
    children: [formItemLabelRun(fieldLabel), new TextRun({ text: value })],
  })

export const checkboxRun = (text: string, checked = false): [CheckBox, TextRun] => [
  new CheckBox({ checked }),
  new TextRun({ text: ` ${text}    ` }),
]

export const headingForDepth = (depth: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] => {
  const headingLevels = [
    HeadingLevel.HEADING_1,
    HeadingLevel.HEADING_2,
    HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4,
    HeadingLevel.HEADING_5,
    HeadingLevel.HEADING_6,
  ]
  return headingLevels[Math.min(depth, headingLevels.length - 1)]
}

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

export const getCoordinateLabelByField = (
  nodeDef: NodeDefCoordinate,
  context: RenderContext
): Record<string, string> => {
  const valueFields = [
    NodeValues.ValuePropsCoordinate.srs,
    NodeValues.ValuePropsCoordinate.x,
    NodeValues.ValuePropsCoordinate.y,
    ...NodeDefs.getCoordinateAdditionalFields(nodeDef),
  ]
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

export const getTaxonFieldCommonProps = (): IParagraphOptions => ({
  spacing: { before: 0, after: 0 },
  indent: { left: 360 },
})

export const isEntityInDifferentPage = (cycle: string, currentPageUuid: string | undefined) => (def: NodeDefEntity) =>
  NodeDefs.getPageUuid(cycle)(def) !== currentPageUuid

export const isNodeBlank = (node?: ArenaNode): boolean => !node || Nodes.isValueBlank(node)

export const isNodeFilled = (node?: ArenaNode): node is ArenaNode => !isNodeBlank(node)

export const getEntityTitle = (entityDef: NodeDefEntity, context: RenderContext, index: number): string =>
  `${label(entityDef, context.lang)} #${index + 1}`

export const getRootOrEntityHeading = (entityDef: NodeDefEntity, context: RenderContext): string =>
  label(entityDef, context.lang)

export const getIsTableLayout = (entityDef: NodeDefEntity, cycle: string): boolean =>
  NodeDefs.getLayoutRenderType(cycle)(entityDef) === 'table'

export const getFormHeaderLevelByDepth = (depth: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] => {
  const headingMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
    0: HeadingLevel.HEADING_3,
    1: HeadingLevel.HEADING_4,
    2: HeadingLevel.HEADING_5,
  }
  return headingMap[Math.min(depth, 2)] ?? HeadingLevel.HEADING_5
}

export const getHeadingText = (nodeDef: NodeDef<NodeDefType>, context: RenderContext): string =>
  label(nodeDef, context.lang)

export const getValueFields = (nodeDef: NodeDefCoordinate): string[] => [
  NodeValues.ValuePropsCoordinate.srs,
  NodeValues.ValuePropsCoordinate.x,
  NodeValues.ValuePropsCoordinate.y,
  ...NodeDefs.getCoordinateAdditionalFields(nodeDef),
]

export const hasRecordMode = (context: RenderContext): boolean => Boolean(context.record)

export const getNodeDefTitle = (nodeDef: NodeDef<NodeDefType>, context: RenderContext): string =>
  label(nodeDef, context.lang)
