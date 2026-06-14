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

const serializeElements = (doc: PDFKit.PDFDocument, elements: PdfElement[]): void => {
  for (const el of elements) {
    switch (el.kind) {
      case 'title':
        doc.font(FONT_BOLD).fontSize(24).text(el.text, { align: 'center' }).moveDown(0.5)
        break

      case 'subtitle':
        doc.font(FONT_NORMAL).fontSize(14).text(el.text, { align: 'center' }).moveDown(0.5)
        break

      case 'heading': {
        if (el.pageBreak) doc.addPage()
        const size = HEADING_SIZES[Math.min(el.level + 1, 6)] ?? 10
        doc.font(FONT_BOLD).fontSize(size).text(el.text).moveDown(0.2)
        break
      }

      case 'fieldRow': {
        const value = el.value ?? el.placeholder ?? EMPTY_FIELD
        doc.font(FONT_BOLD).fontSize(10)
        const labelWidth = doc.widthOfString(`${el.label}: `)
        doc.text(`${el.label}: `, { continued: true })
        doc.font(FONT_NORMAL).text(value)
        doc.moveDown(0.2)
        void labelWidth // used implicitly via continued text
        break
      }

      case 'checkboxRow': {
        doc.font(FONT_BOLD).fontSize(10).text(`${el.label}: `, { continued: true })
        const optionParts = el.options.map((opt) => `${opt.checked ? '[x]' : '[ ]'} ${opt.text}`)
        doc.font(FONT_NORMAL).text(optionParts.join('   '))
        doc.moveDown(0.2)
        break
      }

      case 'compositeBlock': {
        doc.font(FONT_BOLD).fontSize(10).text(`${el.label}:`)
        for (const subField of el.subFields) {
          const val = subField.value ?? subField.placeholder ?? EMPTY_FIELD
          doc.font(FONT_BOLD).text(`  ${subField.label}: `, { continued: true })
          doc.font(FONT_NORMAL).text(val)
        }
        doc.moveDown(0.2)
        break
      }

      case 'image': {
        doc.font(FONT_BOLD).fontSize(10).text(`${el.label}:`).moveDown(0.1)
        try {
          doc.image(el.buffer, { width: el.width, height: el.height })
        } catch {
          doc.font(FONT_NORMAL).text('[image]')
        }
        doc.moveDown(0.3)
        break
      }

      case 'table': {
        if (el.headers.length === 0) break
        const colWidth = CONTENT_WIDTH / el.headers.length
        const cellPad = 4
        const rowHeight = 20

        const drawRow = (values: string[], y: number, bold: boolean): void => {
          doc.font(bold ? FONT_BOLD : FONT_NORMAL).fontSize(9)
          values.forEach((val, i) => {
            const x = MARGIN + i * colWidth
            doc.rect(x, y, colWidth, rowHeight).stroke()
            doc.text(val, x + cellPad, y + cellPad, {
              width: colWidth - cellPad * 2,
              height: rowHeight - cellPad * 2,
              ellipsis: true,
              lineBreak: false,
            })
          })
        }

        let y = doc.y
        drawRow(el.headers, y, true)
        y += rowHeight

        const displayRows = el.rows.length > 0 ? el.rows : [el.headers.map(() => '')]
        for (const row of displayRows) {
          if (y + rowHeight > doc.page.height - MARGIN) {
            doc.addPage()
            y = MARGIN
          }
          drawRow(row, y, false)
          y += rowHeight
        }
        doc.y = y
        doc.moveDown(0.5)
        break
      }

      case 'spacer':
        doc.moveDown(0.5)
        break
    }
  }
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
