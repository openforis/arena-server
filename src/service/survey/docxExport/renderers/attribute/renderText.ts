import { EMPTY_FIELD, fieldRow, formatNodeValue, isNodeFilled, label, valueRow } from './common'
import type { AttributeRenderer } from './types'

export const renderText: AttributeRenderer = async ({ nodeDef, context, node }) => {
  const lbl = label(nodeDef, context.lang)
  if (isNodeFilled(node)) {
    return [valueRow(lbl, formatNodeValue(nodeDef, context, node))]
  }
  return [fieldRow(lbl, EMPTY_FIELD)]
}
