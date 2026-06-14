import PDFDocument from 'pdfkit'

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
const EMPTY_FIELD = '________________________________'

const HEADING_SIZES: Record<number, number> = { 1: 18, 2: 16, 3: 14, 4: 12, 5: 11, 6: 10 }
const TABLE_CELL_PAD = 4
const TABLE_ROW_HEIGHT = 20

const renderTitle = (doc: PDFKit.PDFDocument, el: Extract<PdfElement, { kind: 'title' }>): void => {
  doc.font(FONT_BOLD).fontSize(24).text(el.text, { align: 'center' }).moveDown(0.5)
}

const renderSubtitle = (doc: PDFKit.PDFDocument, el: Extract<PdfElement, { kind: 'subtitle' }>): void => {
  doc.font(FONT_NORMAL).fontSize(14).text(el.text, { align: 'center' }).moveDown(0.5)
}

const renderHeading = (doc: PDFKit.PDFDocument, el: Extract<PdfElement, { kind: 'heading' }>): void => {
  if (el.pageBreak) doc.addPage()
  const size = HEADING_SIZES[Math.min(el.level + 1, 6)] ?? 10
  doc.font(FONT_BOLD).fontSize(size).text(el.text).moveDown(0.2)
}

const renderFieldRow = (doc: PDFKit.PDFDocument, el: Extract<PdfElement, { kind: 'fieldRow' }>): void => {
  const value = el.value ?? el.placeholder ?? EMPTY_FIELD
  doc.font(FONT_BOLD).fontSize(10).text(`${el.label}: `, { continued: true })
  doc.font(FONT_NORMAL).text(value)
  doc.moveDown(0.2)
}

const renderCheckboxRow = (doc: PDFKit.PDFDocument, el: Extract<PdfElement, { kind: 'checkboxRow' }>): void => {
  doc.font(FONT_BOLD).fontSize(10).text(`${el.label}: `, { continued: true })
  const optionParts = el.options.map((opt) => `${opt.checked ? '[x]' : '[ ]'} ${opt.text}`)
  doc.font(FONT_NORMAL).text(optionParts.join('   '))
  doc.moveDown(0.2)
}

const renderCompositeBlock = (doc: PDFKit.PDFDocument, el: Extract<PdfElement, { kind: 'compositeBlock' }>): void => {
  doc.font(FONT_BOLD).fontSize(10).text(`${el.label}:`)
  for (const subField of el.subFields) {
    const val = subField.value ?? subField.placeholder ?? EMPTY_FIELD
    doc.font(FONT_BOLD).text(`  ${subField.label}: `, { continued: true })
    doc.font(FONT_NORMAL).text(val)
  }
  doc.moveDown(0.2)
}

const renderImage = (doc: PDFKit.PDFDocument, el: Extract<PdfElement, { kind: 'image' }>): void => {
  doc.font(FONT_BOLD).fontSize(10).text(`${el.label}:`).moveDown(0.1)
  try {
    doc.image(el.buffer, { width: el.width, height: el.height })
  } catch {
    doc.font(FONT_NORMAL).text('[image]')
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

const serializeElement = (doc: PDFKit.PDFDocument, el: PdfElement): void => {
  switch (el.kind) {
    case 'title':
      return renderTitle(doc, el)
    case 'subtitle':
      return renderSubtitle(doc, el)
    case 'heading':
      return renderHeading(doc, el)
    case 'fieldRow':
      return renderFieldRow(doc, el)
    case 'checkboxRow':
      return renderCheckboxRow(doc, el)
    case 'compositeBlock':
      return renderCompositeBlock(doc, el)
    case 'image':
      return renderImage(doc, el)
    case 'table':
      return renderTable(doc, el)
    case 'spacer':
      doc.moveDown(0.5)
  }
}

const serializeElements = (doc: PDFKit.PDFDocument, elements: PdfElement[]): void => {
  for (const el of elements) serializeElement(doc, el)
}

// ─── Generator ────────────────────────────────────────────────────────────────

const generateSurveyPdf = async (options: SurveyPdfOptions): Promise<SurveyPdfResult> => {
  const renderer = new PdfSurveyDocRenderer()
  const { elements, surveyName } = await walkSurvey(options, renderer)

  return new Promise<SurveyPdfResult>((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: 'A4' })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve({ buffer: Buffer.concat(chunks), surveyName }))
    doc.on('error', reject)

    serializeElements(doc, elements)
    doc.end()
  })
}

export const SurveyPdfGenerator = {
  generateSurveyPdf,
}
