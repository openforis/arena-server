import {
  IBorderOptions,
  ITableBordersOptions,
  ITableWidthProperties,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'

import type { Node as ArenaNode, NodeDefEntity, NodeDefEntityChildPosition } from '@openforis/arena-core'
import { NodeDef, NodeDefType, NodeDefs, Records, Surveys } from '@openforis/arena-core'

import { MAX_IMAGE_WIDTH } from '../../ImageUtils'
import type { RenderContext } from '../attribute'
import { formatNodeValue, label } from '../attribute/common'

// ─── Constants ────────────────────────────────────────────────────────────

export const TABLE_MAX_AVAILABLE_WIDTH: ITableWidthProperties = { size: 100, type: WidthType.PERCENTAGE }

const BORDER_NONE: IBorderOptions = { style: 'none', size: 0, color: 'FFFFFF' }

export const TABLE_BORDERS_NONE: ITableBordersOptions = {
  top: BORDER_NONE,
  bottom: BORDER_NONE,
  left: BORDER_NONE,
  right: BORDER_NONE,
  insideHorizontal: BORDER_NONE,
  insideVertical: BORDER_NONE,
}

const DOC_PAGE_WIDTH_TWIPS = 12240
const DOC_HORIZONTAL_MARGINS_TWIPS = 1080 + 1080
const TWIPS_PER_INCH = 1440
const PX_PER_INCH = 96
const DOC_CONTENT_WIDTH_PX = Math.floor(
  ((DOC_PAGE_WIDTH_TWIPS - DOC_HORIZONTAL_MARGINS_TWIPS) / TWIPS_PER_INCH) * PX_PER_INCH
)
const MIN_CELL_IMAGE_WIDTH = 80
const CELL_IMAGE_PADDING_PX = 12

// ─── Helper Functions ────────────────────────────────────────────────────────

export const getMaxImageWidthForGridCell = (gridColumns: number, columnSpan: number): number => {
  const columns = Math.max(gridColumns, 1)
  const span = Math.max(columnSpan, 1)
  const estimatedCellWidth = Math.floor((DOC_CONTENT_WIDTH_PX / columns) * span) - CELL_IMAGE_PADDING_PX
  return Math.max(MIN_CELL_IMAGE_WIDTH, Math.min(MAX_IMAGE_WIDTH, estimatedCellWidth))
}

export const emptyTableRows = (attrDefs: NodeDef<NodeDefType>[], count = 3): TableRow[] =>
  Array.from(
    { length: count },
    () => new TableRow({ children: attrDefs.map(() => new TableCell({ children: [new Paragraph({ text: '' })] })) })
  )

// ─── Table Renderer ──────────────────────────────────────────────────────────

/**
 * Renders a multiple entity with table layout as a Table element.
 * Includes header row with attribute labels and data rows from the record.
 */
export const renderEntityAsTable = (
  entityDef: NodeDefEntity,
  context: RenderContext,
  parentEntityNode?: ArenaNode
): Table => {
  const { survey, lang, cycle, record } = context
  const children = Surveys.getNodeDefChildrenSorted({
    survey,
    nodeDef: entityDef,
    cycle,
    includeAnalysis: false,
    includeLayoutElements: true,
  })
  const attrDefs = children.filter(NodeDefs.isAttribute)

  const headerCells = attrDefs.map(
    (attr) =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: label(attr, lang), bold: true })] })],
        shading: { fill: 'D9E1F2' },
      })
  )

  let dataRows: TableRow[]
  if (record && parentEntityNode) {
    const entityNodes = Records.getChildren(parentEntityNode, entityDef.uuid)(record)
    if (entityNodes.length > 0) {
      dataRows = entityNodes.map(
        (entityNode) =>
          new TableRow({
            children: attrDefs.map((attrDef) => {
              const attrNode = Records.getChildren(entityNode, attrDef.uuid)(record)[0]
              const cellText = attrNode ? formatNodeValue(attrDef, context, attrNode) : ''
              return new TableCell({ children: [new Paragraph({ text: cellText })] })
            }),
          })
      )
    } else {
      dataRows = emptyTableRows(attrDefs)
    }
  } else {
    dataRows = emptyTableRows(attrDefs)
  }

  return new Table({
    width: TABLE_MAX_AVAILABLE_WIDTH,
    rows: [new TableRow({ children: headerCells, tableHeader: true }), ...dataRows],
  })
}

// ─── Grid Cell Type ────────────────────────────────────────────────────────

export type GridCell = { item: NodeDefEntityChildPosition; nodeDef: NodeDef<NodeDefType> | undefined }
