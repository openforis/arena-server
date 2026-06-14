import {
  AlignmentType,
  HeadingLevel,
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

import type { GridRow, SurveyDocRenderer } from '../docExport/SurveyDocRenderer'
import type { AttributeRendererArgs, RenderLimits } from '../docExport/types'
import { renderAttributeByType } from './renderers/attribute'
import type { DocChild } from './renderers/attribute'

// ─── Table layout constants ───────────────────────────────────────────────────

const TABLE_MAX_AVAILABLE_WIDTH: ITableWidthProperties = { size: 100, type: WidthType.PERCENTAGE }

const BORDER_NONE: IBorderOptions = { style: 'none', size: 0, color: 'FFFFFF' }
const TABLE_BORDERS_NONE: ITableBordersOptions = {
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
const MAX_IMAGE_WIDTH = 500
const MAX_IMAGE_HEIGHT = 500

// ─── Heading helpers ──────────────────────────────────────────────────────────

const HEADING_LEVELS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
]

const headingForDepth = (depth: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] =>
  HEADING_LEVELS[Math.min(depth, HEADING_LEVELS.length - 1)]

// ─── Empty row helper ─────────────────────────────────────────────────────────

const emptyTableRows = (columnCount: number, count = 3): TableRow[] =>
  Array.from(
    { length: count },
    () =>
      new TableRow({
        children: Array.from({ length: columnCount }, () => new TableCell({ children: [new Paragraph({ text: '' })] })),
      })
  )

// ─── Renderer implementation ──────────────────────────────────────────────────

export class DocxSurveyDocRenderer implements SurveyDocRenderer<DocChild> {
  renderTitle(text: string, hasSubtitle: boolean): DocChild[] {
    return [
      new Paragraph({
        text,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: hasSubtitle ? 100 : 400 },
      }),
    ]
  }

  renderSubtitle(text: string): DocChild[] {
    return [
      new Paragraph({
        text,
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      }),
    ]
  }

  renderEntityHeading(text: string, depth: number, pageBreak: boolean): DocChild[] {
    return [
      new Paragraph({
        text,
        heading: headingForDepth(depth),
        spacing: { before: 300, after: 120 },
        pageBreakBefore: pageBreak,
      }),
    ]
  }

  renderEntityInstanceHeading(text: string, depth: number): DocChild[] {
    return [
      new Paragraph({
        text,
        heading: headingForDepth(Math.min(depth + 1, HEADING_LEVELS.length - 1)),
        spacing: { before: 200, after: 80 },
      }),
    ]
  }

  async renderAttribute(args: AttributeRendererArgs): Promise<DocChild[]> {
    return renderAttributeByType(args)
  }

  renderGridTable(rows: Array<GridRow<DocChild>>): DocChild[] {
    const tableRows = rows.map(
      (row) =>
        new TableRow({
          children: row.map(
            (cell) =>
              new TableCell({
                children: cell.content.length > 0 ? cell.content : [new Paragraph({ text: '' })],
                columnSpan: cell.colSpan,
                rowSpan: cell.rowSpan,
              })
          ),
        })
    )
    return [
      new Table({
        width: TABLE_MAX_AVAILABLE_WIDTH,
        rows: tableRows,
        borders: TABLE_BORDERS_NONE,
      }),
    ]
  }

  renderEntityTable(headers: string[], rows: string[][]): DocChild[] {
    const headerRow = new TableRow({
      tableHeader: true,
      children: headers.map(
        (h) =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
            shading: { fill: 'D9E1F2' },
          })
      ),
    })

    const dataRows =
      rows.length > 0
        ? rows.map(
            (row) =>
              new TableRow({
                children: row.map((cellText) => new TableCell({ children: [new Paragraph({ text: cellText })] })),
              })
          )
        : emptyTableRows(headers.length)

    return [new Table({ width: TABLE_MAX_AVAILABLE_WIDTH, rows: [headerRow, ...dataRows] })]
  }

  getGridCellLimits(columnCount: number, columnSpan: number): RenderLimits {
    const columns = Math.max(columnCount, 1)
    const span = Math.max(columnSpan, 1)
    const estimatedCellWidth = Math.floor((DOC_CONTENT_WIDTH_PX / columns) * span) - CELL_IMAGE_PADDING_PX
    return {
      maxImageWidth: Math.max(MIN_CELL_IMAGE_WIDTH, Math.min(MAX_IMAGE_WIDTH, estimatedCellWidth)),
      maxImageHeight: MAX_IMAGE_HEIGHT,
    }
  }
}
