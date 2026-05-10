import { Paragraph, TextRun } from 'docx'

import type { NodeDefCoordinate } from '@openforis/arena-core'

import {
  EMPTY_SHORT,
  formItemLabelRun,
  getCoordinateLabelByField,
  isNodeFilled,
  label,
  SPACING_COMPOSITE_LABEL_ROW,
  inputLine,
  getValueFields,
} from './common'
import type { AttributeRenderer } from './types'

export const renderCoordinate: AttributeRenderer = async ({ nodeDef, context, node }) => {
  const coordinateDef = nodeDef as NodeDefCoordinate
  const lbl = label(coordinateDef, context.lang)
  const hasValue = isNodeFilled(node)
  const val = hasValue ? (node.value ?? {}) : null
  const valueFields = getValueFields(coordinateDef)
  const labelByField = getCoordinateLabelByField(coordinateDef, context)

  return [
    new Paragraph({ spacing: SPACING_COMPOSITE_LABEL_ROW, children: [formItemLabelRun(lbl, false)] }),
    ...valueFields.map((valueField) => {
      const fieldLabel = labelByField[valueField]
      const fieldValue = String(val?.[valueField] ?? EMPTY_SHORT)
      return new Paragraph({
        spacing: { before: 0, after: 0 },
        indent: { left: 360 },
        children: [formItemLabelRun(fieldLabel), hasValue ? new TextRun({ text: fieldValue }) : inputLine(fieldValue)],
      })
    }),
  ]
}
