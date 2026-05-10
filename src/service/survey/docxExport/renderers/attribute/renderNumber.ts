import { formatNodeValue, isNodeFilled, label, valueRow, fieldRow, EMPTY_SHORT } from './common'
import type { AttributeRenderer } from './types'

export const renderNumber: AttributeRenderer = async ({ nodeDef, context, node }) => {
  const lbl = label(nodeDef, context.lang)
  if (isNodeFilled(node)) {
    return [valueRow(lbl, formatNodeValue(nodeDef, context, node))]
  }
  return [fieldRow(lbl, EMPTY_SHORT)]
}
