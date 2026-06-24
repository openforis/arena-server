import PDFDocument from 'pdfkit'

import { fetchSurveyDocImages, type SurveyDocImageData } from '../docExport/surveyDocImages'
import type { SurveyDocOptions } from '../docExport/types'
import { walkSurvey } from '../docExport/SurveyDocWalker'
import type { PdfElement } from './PdfElement'
import { PdfSurveyDocRenderer } from './PdfSurveyDocRenderer'

// ─── public API ───────────────────────────────────────────────────────────────

export type SurveyPdfOptions = SurveyDocOptions

export interface SurveyPdfResult {
  buffer: Buffer
  surveyName: string
}

// ─── PDF serialization ────────────────────────────────────────────────────────

const FONT_NORMAL = 'Helvetica'
const FONT_BOLD = 'Helvetica-Bold'
const MARGIN = 50
const PAGE_WIDTH = 595.28 // A4 points
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const HEADER_FOOTER_GAP = 10
const EMPTY_FIELD = '________________________________'

const COLOR_DEFAULT = '#000000'
const COLOR_TITLE = '#1F3864' // dark navy — matches Word Title style
const COLOR_SUBTITLE = '#2E74B5' // Office blue — matches Word Heading 2 default

const HEADING_SIZES: Record<number, number> = { 1: 18, 2: 16, 3: 14, 4: 12, 5: 11, 6: 10 }
const TABLE_CELL_PAD = 4
const TABLE_ROW_HEIGHT = 20
const GRID_CELL_PAD = 8 // right-side gap between grid columns

type CellOpts = { x: number; width: number }

const renderTitle = (doc: PDFKit.PDFDocument, el: Extract<PdfElement, { kind: 'title' }>, cell?: CellOpts): void => {
  const x = cell?.x ?? MARGIN
  const width = cell?.width ?? CONTENT_WIDTH
  doc
    .fillColor(COLOR_TITLE)
    .font(FONT_BOLD)
    .fontSize(24)
    .text(el.text, x, doc.y, { align: cell ? 'left' : 'center', width })
    .fillColor(COLOR_DEFAULT)
    .moveDown(el.hasSubtitle ? 0.2 : 0.5)
}

const renderSubtitle = (
  doc: PDFKit.PDFDocument,
  el: Extract<PdfElement, { kind: 'subtitle' }>,
  cell?: CellOpts
): void => {
  const x = cell?.x ?? MARGIN
  const width = cell?.width ?? CONTENT_WIDTH
  doc
    .fillColor(COLOR_SUBTITLE)
    .font(FONT_BOLD)
    .fontSize(14)
    .text(el.text, x, doc.y, { align: cell ? 'left' : 'center', width })
    .fillColor(COLOR_DEFAULT)
    .moveDown(1)
}

const renderHeading = (
  doc: PDFKit.PDFDocument,
  el: Extract<PdfElement, { kind: 'heading' }>,
  cell?: CellOpts
): void => {
  if (el.pageBreak && !cell) doc.addPage()
  const size = HEADING_SIZES[Math.min(el.level + 1, 6)] ?? 10
  const x = cell?.x ?? MARGIN
  const width = cell?.width ?? CONTENT_WIDTH
  doc.font(FONT_BOLD).fontSize(size).text(el.text, x, doc.y, { width }).moveDown(0.2)
}

const renderFieldRow = (
  doc: PDFKit.PDFDocument,
  el: Extract<PdfElement, { kind: 'fieldRow' }>,
  cell?: CellOpts
): void => {
  const value = el.value ?? el.placeholder ?? EMPTY_FIELD
  const x = cell?.x ?? MARGIN
  const width = cell?.width ?? CONTENT_WIDTH
  doc.font(FONT_BOLD).fontSize(10).text(`${el.label}: `, x, doc.y, { continued: true, width })
  doc.font(FONT_NORMAL).text(value)
  doc.moveDown(0.2)
}

const renderCheckboxRow = (
  doc: PDFKit.PDFDocument,
  el: Extract<PdfElement, { kind: 'checkboxRow' }>,
  cell?: CellOpts
): void => {
  const x = cell?.x ?? MARGIN
  const width = cell?.width ?? CONTENT_WIDTH
  const optionParts = el.options.map((opt) => `${opt.checked ? '[x]' : '[ ]'} ${opt.text}`)
  doc.font(FONT_BOLD).fontSize(10).text(`${el.label}: `, x, doc.y, { continued: true, width })
  doc.font(FONT_NORMAL).text(optionParts.join('   '))
  doc.moveDown(0.2)
}

const renderCompositeBlock = (
  doc: PDFKit.PDFDocument,
  el: Extract<PdfElement, { kind: 'compositeBlock' }>,
  cell?: CellOpts
): void => {
  const x = cell?.x ?? MARGIN
  const width = cell?.width ?? CONTENT_WIDTH
  doc.font(FONT_BOLD).fontSize(10).text(`${el.label}:`, x, doc.y, { width })
  for (const subField of el.subFields) {
    const val = subField.value ?? subField.placeholder ?? EMPTY_FIELD
    doc.font(FONT_BOLD).text(`  ${subField.label}: `, x, doc.y, { continued: true, width })
    doc.font(FONT_NORMAL).text(val)
  }
  doc.moveDown(0.2)
}

const renderImage = (doc: PDFKit.PDFDocument, el: Extract<PdfElement, { kind: 'image' }>, cell?: CellOpts): void => {
  const x = cell?.x ?? MARGIN
  const width = cell?.width ?? CONTENT_WIDTH
  try {
    const imgWidth = Math.min(el.width, width)
    const ratio = el.width > 0 ? imgWidth / el.width : 1
    const contentBottom = doc.page.height - doc.page.margins.bottom
    const maxImgHeight = doc.page.height - doc.page.margins.top - doc.page.margins.bottom
    const imgHeight = Math.min(Math.round(el.height * ratio), maxImgHeight)
    // Estimate the label line height before deciding whether to add a page, so the
    // label and the image always land on the same page.
    doc.font(FONT_BOLD).fontSize(10)
    const labelHeight = doc.currentLineHeight(true) * 1.1
    if (doc.y + labelHeight + imgHeight > contentBottom) {
      doc.addPage()
    }
    doc.text(`${el.label}:`, x, doc.y, { width }).moveDown(0.1)
    const imageY = doc.y
    doc.image(el.buffer, x, imageY, { width: imgWidth, height: imgHeight })
    doc.y = imageY + imgHeight
  } catch {
    doc.font(FONT_BOLD).fontSize(10).text(`${el.label}:`, x, doc.y, { width })
    doc.font(FONT_NORMAL).text('[image]', x, doc.y, { width })
  }
  doc.moveDown(0.3)
}

const drawTableRow = (doc: PDFKit.PDFDocument, values: string[], y: number, bold: boolean, colWidth: number): void => {
  doc.font(bold ? FONT_BOLD : FONT_NORMAL).fontSize(9)
  values.forEach((val, i) => {
    const x = MARGIN + i * colWidth
    doc.rect(x, y, colWidth, TABLE_ROW_HEIGHT).stroke()
    doc.text(val, x + TABLE_CELL_PAD, y + TABLE_CELL_PAD, {
      width: colWidth - TABLE_CELL_PAD * 2,
      height: TABLE_ROW_HEIGHT - TABLE_CELL_PAD * 2,
      ellipsis: true,
      lineBreak: false,
    })
  })
}

const renderTable = (doc: PDFKit.PDFDocument, el: Extract<PdfElement, { kind: 'table' }>): void => {
  if (el.headers.length === 0) return
  const colWidth = CONTENT_WIDTH / el.headers.length

  let y = doc.y
  drawTableRow(doc, el.headers, y, true, colWidth)
  y += TABLE_ROW_HEIGHT

  const displayRows = el.rows.length > 0 ? el.rows : [el.headers.map(() => '')]
  for (const row of displayRows) {
    if (y + TABLE_ROW_HEIGHT > doc.page.height - MARGIN) {
      doc.addPage()
      y = MARGIN
    }
    drawTableRow(doc, row, y, false, colWidth)
    y += TABLE_ROW_HEIGHT
  }
  doc.y = y
  doc.moveDown(0.5)
}

// Forward declaration — renderGridRow and serializeElement are mutually recursive.
// eslint-disable-next-line prefer-const
let serializeElement: (doc: PDFKit.PDFDocument, el: PdfElement, cell?: CellOpts) => void

const renderGridRow = (doc: PDFKit.PDFDocument, el: Extract<PdfElement, { kind: 'gridRow' }>): void => {
  const { cells, columnCount } = el
  const baseColWidth = CONTENT_WIDTH / columnCount

  // If remaining vertical space on the current page is too small for even one text line,
  // the first cell would trigger an auto page-break and subsequent cells would restore
  // doc.y to the old (near-bottom) position on the new page, causing one field per page.
  const remainingSpace = doc.page.height - doc.page.margins.bottom - doc.y
  if (remainingSpace < TABLE_ROW_HEIGHT) {
    doc.addPage()
  }

  const rowStartY = doc.y
  let maxEndY = rowStartY
  let pageBreakOccurred = false

  for (const cell of cells) {
    const colX = MARGIN + baseColWidth * cell.columnIndex
    const cellContentWidth = Math.max(40, baseColWidth * cell.colSpan - GRID_CELL_PAD)
    // After a page break, stack subsequent cells below the previous one on the new
    // page instead of restoring rowStartY (which belongs to the old page).
    doc.y = pageBreakOccurred ? maxEndY : rowStartY
    for (const elem of cell.content) {
      serializeElement(doc, elem, { x: colX, width: cellContentWidth })
    }
    if (!pageBreakOccurred && doc.y < rowStartY) {
      // doc.y is now on a new page and lower than rowStartY from the old page.
      pageBreakOccurred = true
      maxEndY = doc.y
    } else {
      maxEndY = Math.max(maxEndY, doc.y)
    }
  }

  doc.y = maxEndY
  doc.moveDown(0.2)
}

serializeElement = (doc: PDFKit.PDFDocument, el: PdfElement, cell?: CellOpts): void => {
  switch (el.kind) {
    case 'title':
      return renderTitle(doc, el, cell)
    case 'subtitle':
      return renderSubtitle(doc, el, cell)
    case 'heading':
      return renderHeading(doc, el, cell)
    case 'fieldRow':
      return renderFieldRow(doc, el, cell)
    case 'checkboxRow':
      return renderCheckboxRow(doc, el, cell)
    case 'compositeBlock':
      return renderCompositeBlock(doc, el, cell)
    case 'image':
      return renderImage(doc, el, cell)
    case 'table':
      return renderTable(doc, el)
    case 'gridRow':
      return renderGridRow(doc, el)
    case 'spacer':
      doc.moveDown(0.5)
  }
}

const serializeElements = (doc: PDFKit.PDFDocument, elements: PdfElement[]): void => {
  for (const el of elements) serializeElement(doc, el)
}

const drawSurveyDocImage = (doc: PDFKit.PDFDocument, image: SurveyDocImageData, y: number): void => {
  try {
    const x = MARGIN + (CONTENT_WIDTH - image.width) / 2
    doc.image(image.buffer, x, y, { width: image.width, height: image.height })
  } catch {
    // Ignore unsupported or corrupted image data.
  }
}

const drawHeaderFooterImages = (
  doc: PDFKit.PDFDocument,
  headerImage?: SurveyDocImageData,
  footerImage?: SurveyDocImageData
): void => {
  if (headerImage) {
    drawSurveyDocImage(doc, headerImage, MARGIN)
  }
  if (footerImage) {
    drawSurveyDocImage(doc, footerImage, doc.page.height - MARGIN - footerImage.height)
  }
}

// ─── Generator ────────────────────────────────────────────────────────────────

const generateSurveyPdf = async (options: SurveyPdfOptions): Promise<SurveyPdfResult> => {
  const renderer = new PdfSurveyDocRenderer()
  const { elements, surveyName } = await walkSurvey(options, renderer)
  const { headerImage, footerImage } = await fetchSurveyDocImages(options, { maxWidth: CONTENT_WIDTH })

  const headerHeight = headerImage?.height ?? 0
  const footerHeight = footerImage?.height ?? 0
  const topMargin = MARGIN + headerHeight + (headerHeight > 0 ? HEADER_FOOTER_GAP : 0)
  const bottomMargin = MARGIN + footerHeight + (footerHeight > 0 ? HEADER_FOOTER_GAP : 0)

  return new Promise<SurveyPdfResult>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      bufferPages: true,
      margins: {
        top: topMargin,
        bottom: bottomMargin,
        left: MARGIN,
        right: MARGIN,
      },
    })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve({ buffer: Buffer.concat(chunks), surveyName }))
    doc.on('error', reject)

    serializeElements(doc, elements)

    const pageRange = doc.bufferedPageRange()
    for (let pageIndex = pageRange.start; pageIndex < pageRange.start + pageRange.count; pageIndex++) {
      doc.switchToPage(pageIndex)
      drawHeaderFooterImages(doc, headerImage, footerImage)
    }

    doc.end()
  })
}

export const SurveyPdfGenerator = {
  generateSurveyPdf,
}
