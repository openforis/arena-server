import { Paragraph, TextRun } from 'docx'

import { nodeDefFormItemLabelRun, isNodeFilled, label, SPACING_FIELD_ROW, valueRow } from './common'
import type { AttributeRenderer } from './types'

export const renderGeo: AttributeRenderer = async ({ nodeDef, context, node }) => {
  const lbl = label(nodeDef, context.lang)
  if (isNodeFilled(node)) {
    return [valueRow(lbl, '[geometry data]')]
  }

  return [
    new Paragraph({
      spacing: SPACING_FIELD_ROW,
      children: [
        nodeDefFormItemLabelRun(nodeDef, context),
        new TextRun({ text: '[geometry]', italics: true, color: '888888' }),
      ],
    }),
  ]
}
