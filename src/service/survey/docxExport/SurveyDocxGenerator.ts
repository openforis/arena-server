import { AlignmentType, Document, Footer, Header, ImageRun, Packer, Paragraph } from 'docx'

import type { SurveyDocOptions } from '../docExport/types'
import { fetchSurveyDocImages, type SurveyDocImageData } from '../docExport/surveyDocImages'
import { walkSurvey } from '../docExport/SurveyDocWalker'
import { DocxSurveyDocRenderer } from './DocxSurveyDocRenderer'
import { convertDocxToReadOnly } from './docxReadOnlyConverter'

// ─── public API ───────────────────────────────────────────────────────────────

export interface SurveyDocxOptions extends SurveyDocOptions {
  readOnly?: boolean
}

export interface SurveyDocxResult {
  buffer: Buffer
  surveyName: string
}

const buildDocxImageSection = (image: SurveyDocImageData): Paragraph =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new ImageRun({
        data: image.buffer,
        type: image.docxType,
        transformation: {
          width: image.width,
          height: image.height,
        },
      }),
    ],
  })

const buildDocxImageHeader = (image: SurveyDocImageData): Header =>
  new Header({
    children: [buildDocxImageSection(image)],
  })

const buildDocxImageFooter = (image: SurveyDocImageData): Footer =>
  new Footer({
    children: [buildDocxImageSection(image)],
  })

const generateSurveyDocx = async (options: SurveyDocxOptions): Promise<SurveyDocxResult> => {
  const { readOnly } = options
  const renderer = new DocxSurveyDocRenderer()
  const { elements, surveyName } = await walkSurvey(options, renderer)
  const { headerImage, footerImage } = await fetchSurveyDocImages(options)

  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: 'Normal',
          name: 'Normal',
          run: { font: 'Calibri', size: 22 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 1080, right: 1080 },
          },
        },
        ...(headerImage ? { headers: { default: buildDocxImageHeader(headerImage) } } : {}),
        ...(footerImage ? { footers: { default: buildDocxImageFooter(footerImage) } } : {}),
        children: elements,
      },
    ],
  })

  let buffer = await Packer.toBuffer(doc)
  if (readOnly) {
    buffer = await convertDocxToReadOnly(buffer)
  }

  return { buffer, surveyName }
}

export const SurveyDocxGenerator = {
  generateSurveyDocx,
}
