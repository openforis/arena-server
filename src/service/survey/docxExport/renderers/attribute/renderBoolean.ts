import { Paragraph } from 'docx'

import type { NodeDefBoolean } from '@openforis/arena-core'

import { checkboxRun, getBooleanValueLabel, isNodeFilled, nodeDefFormItemLabelRun, SPACING_FIELD_ROW } from './common'
import type { AttributeRenderer } from './types'

export const renderBoolean: AttributeRenderer = async ({ nodeDef, context, node }) => {
  const boolDef = nodeDef as NodeDefBoolean
  const hasValue = isNodeFilled(node)
  const isTrue = hasValue && (node.value === true || node.value === 'true')
  const yesLabel = getBooleanValueLabel(context, boolDef, true)
  const noLabel = getBooleanValueLabel(context, boolDef, false)

  return [
    new Paragraph({
      spacing: SPACING_FIELD_ROW,
      keepLines: true,
      children: [
        nodeDefFormItemLabelRun(nodeDef, context),
        ...checkboxRun(yesLabel, hasValue ? isTrue : false),
        ...checkboxRun(noLabel, hasValue ? !isTrue : false),
      ],
    }),
  ]
}
