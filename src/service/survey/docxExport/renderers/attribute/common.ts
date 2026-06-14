import { CheckBox, HeadingLevel, Paragraph, TextRun, type IParagraphOptions } from 'docx'

import type { NodeDef, NodeDefCoordinate, NodeDefEntity, NodeDefType } from '@openforis/arena-core'
import { NodeDefs } from '@openforis/arena-core'

import { EMPTY_FIELD } from '../../../docExport/common'
import type { RenderContext } from './types'

// ─── Re-export shared format-agnostic helpers ─────────────────────────────────
export {
  EMPTY_FIELD,
  EMPTY_SHORT,
  label,
  getCategoryItemLabel,
  getCommonLabel,
  getBooleanValueLabel,
  formatNodeValue,
  getCoordinateLabelByField,
  getValueFields,
  getIsTableLayout,
  isNodeBlank,
  isNodeFilled,
} from '../../../docExport/common'

// ─── Docx-specific spacing constants ─────────────────────────────────────────

export const SPACING_FIELD_ROW = { before: 80, after: 80 }
export const SPACING_COMPOSITE_LABEL_ROW = { before: 80, after: 40 }

// ─── Docx-specific heading helpers ───────────────────────────────────────────

const HEADING_LEVELS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
]

export const headingForDepth = (depth: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] =>
  HEADING_LEVELS[Math.min(depth, HEADING_LEVELS.length - 1)]

export const getFormHeaderLevelByDepth = (depth: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] => {
  const headingMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
    0: HeadingLevel.HEADING_3,
    1: HeadingLevel.HEADING_4,
    2: HeadingLevel.HEADING_5,
  }
  return headingMap[Math.min(depth, 2)] ?? HeadingLevel.HEADING_5
}

// ─── Docx-specific inline builders ───────────────────────────────────────────

export const formItemLabelRun = (labelText: string, trailingSpace = true): TextRun =>
  new TextRun({ text: `${labelText}:${trailingSpace ? ' ' : ''}`, bold: true })

export const nodeDefFormItemLabelRun = (nodeDef: NodeDef<NodeDefType>, context: RenderContext): TextRun =>
  formItemLabelRun(NodeDefs.getLabelOrName(nodeDef, context.lang))

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

export const getTaxonFieldCommonProps = (): IParagraphOptions => ({
  spacing: { before: 0, after: 0 },
  indent: { left: 360 },
})

// ─── Convenience helpers still used only in docx renderers ────────────────────

export const getHeadingText = (nodeDef: NodeDef<NodeDefType>, context: RenderContext): string =>
  NodeDefs.getLabelOrName(nodeDef, context.lang)

export const isEntityInDifferentPage = (cycle: string, currentPageUuid: string | undefined) => (def: NodeDefEntity) =>
  NodeDefs.getPageUuid(cycle)(def) !== currentPageUuid

export const getCoordinateValueFieldLabel = (nodeDef: NodeDefCoordinate, context: RenderContext): string =>
  NodeDefs.getLabelOrName(nodeDef, context.lang)
