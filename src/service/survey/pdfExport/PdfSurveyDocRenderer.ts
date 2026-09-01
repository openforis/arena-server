import type { NodeDefBoolean, NodeDefCode, NodeDefCoordinate, NodeDefTaxon } from '@openforis/arena-core'
import { NodeDefs, NodeDefType, NodeValues, Surveys, Taxa } from '@openforis/arena-core'

import type { GridRow, SurveyDocRenderer } from '../docExport/SurveyDocRenderer'
import {
  EMPTY_FIELD,
  EMPTY_SHORT,
  formatNodeValue,
  getBooleanValueLabel,
  getCategoryItemLabel,
  getCoordinateLabelByField,
  getValueFields,
  isNodeBlank,
  isNodeFilled,
  label,
} from '../docExport/common'
import type { AttributeRendererArgs, RenderLimits } from '../docExport/types'
import { calculateScaledDimensions, getImageDimensions } from '../docxExport/ImageUtils'
import type { PdfElement } from './PdfElement'

const MAX_IMAGE_WIDTH = 500
const MAX_IMAGE_HEIGHT = 500

export class PdfSurveyDocRenderer implements SurveyDocRenderer<PdfElement> {
  // ─── Document-level ───────────────────────────────────────────────────────

  renderTitle(text: string, hasSubtitle: boolean): PdfElement[] {
    return hasSubtitle ? [{ kind: 'title', text, hasSubtitle: true }] : [{ kind: 'title', text }, { kind: 'spacer' }]
  }

  renderSubtitle(text: string): PdfElement[] {
    return [{ kind: 'subtitle', text }]
  }

  renderEntityHeading(text: string, level: number, pageBreak: boolean): PdfElement[] {
    return [{ kind: 'heading', text, level, pageBreak }]
  }

  renderEntityInstanceHeading(text: string, level: number): PdfElement[] {
    return [{ kind: 'heading', text, level: level + 1 }]
  }

  // ─── Layout ───────────────────────────────────────────────────────────────

  renderGridTable(rows: Array<GridRow<PdfElement>>, columnCount: number): PdfElement[] {
    // occupied[c] = remaining rows column c is blocked by a rowSpan from a previous row
    const occupied = new Array<number>(columnCount).fill(0)
    const result: PdfElement[] = []

    for (const row of rows) {
      let col = 0
      const cells = row.map((cell) => {
        while (col < columnCount && occupied[col] > 0) col++
        const colSpan = cell.colSpan ?? 1
        const rowSpan = cell.rowSpan ?? 1
        if (rowSpan > 1) {
          for (let s = 0; s < colSpan; s++) occupied[col + s] = rowSpan
        }
        const columnIndex = col
        col += colSpan
        return { content: cell.content, colSpan, columnIndex }
      })
      result.push({ kind: 'gridRow' as const, columnCount, cells })
      for (let c = 0; c < columnCount; c++) if (occupied[c] > 0) occupied[c]--
    }

    return result
  }

  renderEntityTable(headers: string[], rows: string[][]): PdfElement[] {
    return [{ kind: 'table', headers, rows }]
  }

  getGridCellLimits(columnCount: number, columnSpan: number): RenderLimits {
    const columns = Math.max(columnCount, 1)
    const span = Math.max(columnSpan, 1)
    const cellWidth = Math.floor((MAX_IMAGE_WIDTH / columns) * span)
    return { maxImageWidth: Math.max(80, cellWidth), maxImageHeight: MAX_IMAGE_HEIGHT }
  }

  // ─── Attribute rendering ──────────────────────────────────────────────────

  async renderAttribute({ nodeDef, context, depth, node, limits }: AttributeRendererArgs): Promise<PdfElement[]> {
    switch (nodeDef.type) {
      case NodeDefType.boolean:
        return this.renderBoolean({ nodeDef: nodeDef as NodeDefBoolean, context, node })
      case NodeDefType.code:
        return this.renderCode({ nodeDef: nodeDef as NodeDefCode, context, node })
      case NodeDefType.coordinate:
        return this.renderCoordinate({ nodeDef: nodeDef as NodeDefCoordinate, context, node })
      case NodeDefType.taxon:
        return this.renderTaxon({ nodeDef: nodeDef as NodeDefTaxon, context, node })
      case NodeDefType.file:
        return this.renderFile({ nodeDef, context, depth, node, limits })
      case NodeDefType.formHeader:
        return [{ kind: 'heading', text: label(nodeDef, context.lang), level: Math.min(depth + 2, 6) }]
      default:
        return this.renderSimpleField({ nodeDef, context, node })
    }
  }

  // ─── Per-type attribute renderers ─────────────────────────────────────────

  private renderSimpleField({
    nodeDef,
    context,
    node,
  }: Pick<AttributeRendererArgs, 'nodeDef' | 'context' | 'node'>): PdfElement[] {
    const lbl = label(nodeDef, context.lang)
    if (isNodeFilled(node)) {
      return [{ kind: 'fieldRow', label: lbl, value: formatNodeValue(nodeDef, context, node) }]
    }
    return [{ kind: 'fieldRow', label: lbl, placeholder: EMPTY_FIELD }]
  }

  private renderBoolean({
    nodeDef,
    context,
    node,
  }: {
    nodeDef: NodeDefBoolean
    context: AttributeRendererArgs['context']
    node: AttributeRendererArgs['node']
  }): PdfElement[] {
    const hasValue = isNodeFilled(node)
    const isTrue = hasValue && (node.value === true || node.value === 'true')
    return [
      {
        kind: 'checkboxRow',
        label: label(nodeDef, context.lang),
        options: [
          { text: getBooleanValueLabel(context, nodeDef, true), checked: hasValue ? isTrue : false },
          { text: getBooleanValueLabel(context, nodeDef, false), checked: hasValue ? !isTrue : false },
        ],
      },
    ]
  }

  private renderCode({
    nodeDef,
    context,
    node,
  }: {
    nodeDef: NodeDefCode
    context: AttributeRendererArgs['context']
    node: AttributeRendererArgs['node']
  }): PdfElement[] {
    const lbl = label(nodeDef, context.lang)
    const { survey, lang } = context
    const items = survey.refData ? Surveys.getCategoryItemsByNodeDef({ survey, nodeDef }) : []

    const selectedItemUuid = node ? NodeValues.getItemUuid(node) : undefined
    const showAsCheckboxes = items.length > 0 && items.length <= 8

    if (showAsCheckboxes) {
      return [
        {
          kind: 'checkboxRow',
          label: lbl,
          options: items.map((item) => ({
            text: getCategoryItemLabel(item, lang),
            checked: selectedItemUuid !== undefined && item.uuid === selectedItemUuid,
          })),
        },
      ]
    }

    if (selectedItemUuid !== undefined) {
      const selectedItem = node?.refData?.categoryItem
      const displayValue = selectedItem
        ? getCategoryItemLabel(selectedItem, lang)
        : (node?.value?.code ?? selectedItemUuid)
      return [{ kind: 'fieldRow', label: lbl, value: String(displayValue) }]
    }

    const sizeLabel = items.length > 0 ? ` (${items.length} options)` : ''
    return [{ kind: 'fieldRow', label: lbl, placeholder: `[select${sizeLabel}]` }]
  }

  private renderCoordinate({
    nodeDef,
    context,
    node,
  }: {
    nodeDef: NodeDefCoordinate
    context: AttributeRendererArgs['context']
    node: AttributeRendererArgs['node']
  }): PdfElement[] {
    const lbl = label(nodeDef, context.lang)
    const hasValue = isNodeFilled(node)
    const val = hasValue ? (node.value ?? {}) : null
    const valueFields = getValueFields(nodeDef)
    const labelByField = getCoordinateLabelByField(nodeDef, context)
    return [
      {
        kind: 'compositeBlock',
        label: lbl,
        subFields: valueFields.map((field) => ({
          label: labelByField[field],
          value: hasValue ? String(val?.[field] ?? '') : undefined,
          placeholder: hasValue ? undefined : EMPTY_SHORT,
        })),
      },
    ]
  }

  private renderTaxon({
    nodeDef,
    context,
    node,
  }: {
    nodeDef: NodeDefTaxon
    context: AttributeRendererArgs['context']
    node: AttributeRendererArgs['node']
  }): PdfElement[] {
    const lbl = label(nodeDef, context.lang)
    const hasValue = isNodeFilled(node)
    const taxon = hasValue ? node.refData?.taxon : undefined
    const vernacularNameVisible = NodeDefs.isFieldVisible(NodeValues.ValuePropsTaxon.vernacularName)(nodeDef)
    const vernacularNameUuid = node ? NodeValues.getVernacularNameUuid(node) : undefined
    const { vernacularName } =
      vernacularNameUuid && taxon ? Taxa.getVernacularNameAndLang(vernacularNameUuid)(taxon) : {}

    const subFields = [
      {
        label: context.i18n.t('surveyForm:nodeDefTaxon.code'),
        value: taxon ? (Taxa.getCode(taxon) ?? '') : undefined,
        placeholder: hasValue ? undefined : EMPTY_SHORT,
      },
      {
        label: context.i18n.t('surveyForm:nodeDefTaxon.scientificName'),
        value: taxon ? Taxa.getScientificName(taxon) : undefined,
        placeholder: hasValue ? undefined : EMPTY_FIELD,
      },
    ]

    if (vernacularNameVisible) {
      subFields.push({
        label: context.i18n.t('surveyForm:nodeDefTaxon.vernacularName'),
        value: vernacularName,
        placeholder: hasValue ? undefined : EMPTY_FIELD,
      })
    }

    return [{ kind: 'compositeBlock', label: lbl, subFields }]
  }

  private async renderFile({
    nodeDef,
    context,
    depth: _depth,
    node,
    limits,
  }: AttributeRendererArgs): Promise<PdfElement[]> {
    const lbl = label(nodeDef, context.lang)

    if (isNodeBlank(node)) {
      return [{ kind: 'fieldRow', label: lbl, placeholder: '[file attachment]' }]
    }

    const nodeDefFile = nodeDef as typeof nodeDef & { props?: { fileType?: string } }
    if (nodeDefFile.props?.fileType === 'image' && context.fileProvider) {
      const fileUuid = NodeValues.getFileUuid(node!)
      if (fileUuid) {
        try {
          const buffer = await context.fileProvider(fileUuid)
          const maxWidth = limits?.maxImageWidth ?? MAX_IMAGE_WIDTH
          const maxHeight = limits?.maxImageHeight ?? MAX_IMAGE_HEIGHT
          const dims = getImageDimensions(buffer)
          const { width, height } = dims
            ? calculateScaledDimensions(dims.width, dims.height, maxWidth, maxHeight)
            : { width: maxWidth, height: maxHeight }
          return [{ kind: 'image', label: lbl, buffer, width, height }]
        } catch {
          // fall through to filename
        }
      }
    }

    const attachedFileName = node ? (NodeValues.getFileName(node) ?? '[attached file]') : '[attached file]'
    return [{ kind: 'fieldRow', label: lbl, value: attachedFileName }]
  }
}
