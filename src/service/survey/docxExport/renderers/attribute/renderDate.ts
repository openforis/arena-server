import { Paragraph, TextRun } from 'docx'

import { formatNodeValue, isNodeFilled, nodeDefFormItemLabelRun, SPACING_FIELD_ROW, valueRow, label } from './common'
import type { AttributeRenderer } from './types'

export const renderDate: AttributeRenderer = async ({ nodeDef, context, node }) => {
  const lbl = label(nodeDef, context.lang)
  if (isNodeFilled(node)) {
    return [valueRow(lbl, formatNodeValue(nodeDef, context, node))]
  }

  return [
    new Paragraph({
      spacing: SPACING_FIELD_ROW,
      keepLines: true,
      children: [
        nodeDefFormItemLabelRun(nodeDef, context),
        new TextRun({ text: 'DD', underline: {} }),
        new TextRun({ text: ' / ' }),
        new TextRun({ text: 'MM', underline: {} }),
        new TextRun({ text: ' / ' }),
        new TextRun({ text: 'YYYY', underline: {} }),
      ],
    }),
  ]
}
