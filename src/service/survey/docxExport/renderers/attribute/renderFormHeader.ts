import { Paragraph } from 'docx'

import { getFormHeaderLevelByDepth, getHeadingText } from './common'
import type { AttributeRenderer } from './types'

export const renderFormHeader: AttributeRenderer = async ({ nodeDef, context, depth }) => [
  new Paragraph({
    text: getHeadingText(nodeDef, context),
    heading: getFormHeaderLevelByDepth(depth),
    spacing: { before: 200, after: 100 },
  }),
]
