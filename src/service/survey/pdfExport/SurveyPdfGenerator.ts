import PDFDocument from 'pdfkit'

import {
  DOC_HEADER_FOOTER_GAP_PT,
  DOC_PAGE_EDGE_MARGIN_PT,
  fetchSurveyDocImages,
  isHeaderOnFirstPageOnly,
  isPageNumberingEnabled,
  type SurveyDocImageData,
} from '../docExport/surveyDocImages'
import type { PrintOrientation, SurveyDocOptions } from '../docExport/types'
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
// pt from page bottom — positions the page number label in the bottom edge margin
const PAGE_NUMBER_BOTTOM_OFFSET = 20
const A4_PORTRAIT: [number, number] = [595.28, 841.89]
const A4_LANDSCAPE: [number, number] = [841.89, 595.28]
const EMPTY_FIELD = '________________________________'

const pageSizeFor = (orientation: PrintOrientation): [number, number] =>
  orientation === 'landscape' ? A4_LANDSCAPE : A4_PORTRAIT

const contentWidthFor = (orientation: PrintOrientation): number => pageSizeFor(orientation)[0] - MARGIN * 2

const contentWidthOf = (doc: PDFKit.PDFDocument): number =>
  doc.page.width - doc.page.margins.left - doc.page.margins.right

// PDFKit's bare addPage() falls back to the *document* options, which would reset a
// landscape section back to the document's initial page size. continueOnNewPage reuses
// the current page's own options instead.
const addPageSameSize = (doc: PDFKit.PDFDocument): void => {
  doc.continueOnNewPage()
}

const COLOR_DEFAULT = '#000000'
const COLOR_TITLE = '#1F3864' // dark navy — matches Word Title style
const COLOR_SUBTITLE = '#2E74B5' // Office blue — matches Word Heading 2 default

const HEADING_SIZES: Record<number, number> = { 1: 18, 2: 16, 3: 14, 4: 12, 5: 11, 6: 10 }
const TABLE_CELL_PAD = 4
const TABLE_ROW_HEIGHT = 20
const GRID_CELL_PAD = 8 // right-side gap between grid columns

type CellOpts = { x: number; width: number }

const getContentBottom = (doc: PDFKit.PDFDocument): number => doc.page.height - doc.page.margins.bottom

const getContentTop = (doc: PDFKit.PDFDocument): number => doc.page.margins.top

const estimateElementHeight = (el: PdfElement): number => {
  switch (el.kind) {
    case 'image':
      return el.height + 24
    case 'heading':
      return 16
    case 'compositeBlock':
      return 14 + el.subFields.length * 12
    case 'checkboxRow':
    case 'fieldRow':
      return 14
    case 'spacer':
      return 8
    default:
      return 14
  }
}

const renderTitle = (doc: PDFKit.PDFDocument, el: Extract<PdfElement, { kind: 'title' }>, cell?: CellOpts): void => {
  const x = cell?.x ?? MARGIN
  const width = cell?.width ?? contentWidthOf(doc)
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
  const width = cell?.width ?? contentWidthOf(doc)
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
  if (el.pageBreak && !cell) addPageSameSize(doc)
  const size = HEADING_SIZES[Math.min(el.level + 1, 6)] ?? 10
  const x = cell?.x ?? MARGIN
  const width = cell?.width ?? contentWidthOf(doc)
  doc.font(FONT_BOLD).fontSize(size).text(el.text, x, doc.y, { width }).moveDown(0.2)
}

const renderFieldRow = (
  doc: PDFKit.PDFDocument,
  el: Extract<PdfElement, { kind: 'fieldRow' }>,
  cell?: CellOpts
): void => {
  const value = el.value ?? el.placeholder ?? EMPTY_FIELD
  const x = cell?.x ?? MARGIN
  const width = cell?.width ?? contentWidthOf(doc)
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
  const width = cell?.width ?? contentWidthOf(doc)
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
  const width = cell?.width ?? contentWidthOf(doc)
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
  const width = cell?.width ?? contentWidthOf(doc)
  try {
    const imgWidth = Math.min(el.width, width)
    const ratio = el.width > 0 ? imgWidth / el.width : 1
    const contentBottom = getContentBottom(doc)
    const maxImgHeight = doc.page.height - doc.page.margins.top - doc.page.margins.bottom
    const imgHeight = Math.min(Math.round(el.height * ratio), maxImgHeight)
    // Estimate the label line height before deciding whether to add a page, so the
    // label and the image always land on the same page.
    doc.font(FONT_BOLD).fontSize(10)
    const labelHeight = doc.currentLineHeight(true) * 1.1
    if (doc.y + labelHeight + imgHeight > contentBottom) {
      addPageSameSize(doc)
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
  const colWidth = contentWidthOf(doc) / el.headers.length

  let y = doc.y
  drawTableRow(doc, el.headers, y, true, colWidth)
  y += TABLE_ROW_HEIGHT

  const displayRows = el.rows.length > 0 ? el.rows : [el.headers.map(() => '')]
  for (const row of displayRows) {
    if (y + TABLE_ROW_HEIGHT > getContentBottom(doc)) {
      addPageSameSize(doc)
      y = getContentTop(doc)
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
  const baseColWidth = contentWidthOf(doc) / columnCount
  const estimatedRowHeight = Math.max(
    TABLE_ROW_HEIGHT,
    ...cells.map((cell) => cell.content.reduce((sum, elem) => sum + estimateElementHeight(elem), 0))
  )

  // If the row cannot fit on the current page, start it on a fresh page so cells stay
  // aligned horizontally instead of each cell landing on its own page.
  if (doc.y + estimatedRowHeight > getContentBottom(doc)) {
    addPageSameSize(doc)
  }

  let rowStartY = doc.y
  let maxEndY = rowStartY
  let pageBreakOccurred = false

  for (const cell of cells) {
    const colX = MARGIN + baseColWidth * cell.columnIndex
    const cellContentWidth = Math.max(40, baseColWidth * cell.colSpan - GRID_CELL_PAD)
    doc.y = pageBreakOccurred ? maxEndY : rowStartY
    for (const elem of cell.content) {
      serializeElement(doc, elem, { x: colX, width: cellContentWidth })
    }
    if (!pageBreakOccurred && doc.y < rowStartY) {
      pageBreakOccurred = true
      rowStartY = doc.y
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

const scaledSurveyDocImageSize = (
  doc: PDFKit.PDFDocument,
  image: SurveyDocImageData
): { width: number; height: number } => {
  const width = Math.min(image.width, contentWidthOf(doc))
  const height = image.height * (width / image.width)
  return { width, height }
}

const drawSurveyDocImage = (doc: PDFKit.PDFDocument, image: SurveyDocImageData, y: number): void => {
  try {
    const { width, height } = scaledSurveyDocImageSize(doc, image)
    const x = MARGIN + (contentWidthOf(doc) - width) / 2
    doc.image(image.buffer, x, y, { width, height })
  } catch {
    // Ignore unsupported or corrupted image data.
  }
}

const drawPageDecorations = (
  doc: PDFKit.PDFDocument,
  pageIndex: number,
  headerImage: SurveyDocImageData | undefined,
  footerImage: SurveyDocImageData | undefined,
  headerOnFirstPageOnly: boolean
): void => {
  if (headerImage && (!headerOnFirstPageOnly || pageIndex === 0)) {
    drawSurveyDocImage(doc, headerImage, DOC_PAGE_EDGE_MARGIN_PT)
  }
  if (footerImage) {
    const { height } = scaledSurveyDocImageSize(doc, footerImage)
    const footerY = doc.page.height - DOC_PAGE_EDGE_MARGIN_PT - height
    drawSurveyDocImage(doc, footerImage, footerY)
  }
}

// ─── Generator ────────────────────────────────────────────────────────────────

const generateSurveyPdf = async (options: SurveyPdfOptions): Promise<SurveyPdfResult> => {
  const pageNumbering = isPageNumberingEnabled(options)
  const renderer = new PdfSurveyDocRenderer()
  const { sections, surveyName } = await walkSurvey(options, renderer)
  const firstOrientation = sections[0]?.orientation ?? options.orientation ?? 'portrait'
  const orientations = sections.length > 0 ? sections.map((s) => s.orientation) : [firstOrientation]
  const maxContentWidth = Math.max(...orientations.map((o) => contentWidthFor(o)))
  const { headerImage, footerImage } = await fetchSurveyDocImages(options, { maxWidth: maxContentWidth })
  const headerOnFirstPageOnly = isHeaderOnFirstPageOnly(options)

  const headerHeight = headerImage?.height ?? 0
  const footerHeight = footerImage?.height ?? 0
  // When the header repeats on every page it must be accommodated by the margin on every page.
  // When it appears on the first page only, use a base margin for all pages and manually advance
  // doc.y past the image on page 1 so pages 2+ don't carry the unnecessary extra gap.
  const topMargin =
    headerImage && !headerOnFirstPageOnly
      ? DOC_PAGE_EDGE_MARGIN_PT + headerHeight + DOC_HEADER_FOOTER_GAP_PT
      : DOC_PAGE_EDGE_MARGIN_PT
  const bottomMargin = DOC_PAGE_EDGE_MARGIN_PT + footerHeight + (footerHeight > 0 ? DOC_HEADER_FOOTER_GAP_PT : 0)
  const pageMargins = {
    top: topMargin,
    bottom: bottomMargin,
    left: MARGIN,
    right: MARGIN,
  }

  return new Promise<SurveyPdfResult>((resolve, reject) => {
    const doc = new PDFDocument({
      size: pageSizeFor(firstOrientation),
      margins: pageMargins,
      // Buffer pages so we can go back and stamp page numbers once we know the total.
      bufferPages: pageNumbering,
      autoFirstPage: true,
    })
    const chunks: Buffer[] = []
    let pageIndex = 0

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve({ buffer: Buffer.concat(chunks), surveyName }))
    doc.on('error', reject)
    doc.on('pageAdded', () => {
      pageIndex++
      drawPageDecorations(doc, pageIndex, headerImage, footerImage, headerOnFirstPageOnly)
    })

    drawPageDecorations(doc, 0, headerImage, footerImage, headerOnFirstPageOnly)
    // When the header is first-page-only, advance the cursor past the image so body content
    // starts below it (the top margin is kept small for all pages, so this is needed on page 1).
    if (headerImage && headerOnFirstPageOnly) {
      doc.y = DOC_PAGE_EDGE_MARGIN_PT + headerImage.height + DOC_HEADER_FOOTER_GAP_PT
    }

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i]
      if (i > 0) {
        doc.addPage({ size: pageSizeFor(section.orientation), margins: pageMargins })
      }
      serializeElements(doc, section.elements)
    }

    if (pageNumbering) {
      const range = doc.bufferedPageRange()
      const totalPages = range.count
      for (let i = 1; i < totalPages; i++) {
        doc.switchToPage(range.start + i)
        // Temporarily zero the bottom margin so PDFKit does not auto-add a page
        // when we stamp text in the footer zone below the content area.
        const savedBottomMargin = doc.page.margins.bottom
        doc.page.margins.bottom = 0
        doc
          .font(FONT_NORMAL)
          .fontSize(9)
          .fillColor(COLOR_DEFAULT)
          .text(`${i + 1} of ${totalPages}`, MARGIN, doc.page.height - PAGE_NUMBER_BOTTOM_OFFSET, {
            width: contentWidthOf(doc),
            align: 'right',
          })
        doc.page.margins.bottom = savedBottomMargin
      }
      doc.flushPages()
    }

    doc.end()
  })
}

export const SurveyPdfGenerator = {
  generateSurveyPdf,
}
