import { AlignmentType, Document, Footer, Header, ImageRun, Packer, Paragraph } from 'docx'

import {
  DOCX_BASE_MARGIN_TWIPS,
  DOCX_MARGIN_GAP_TWIPS,
  fetchSurveyDocImages,
  imageHeightToTwips,
  isHeaderOnFirstPageOnly,
  type SurveyDocImageData,
} from '../docExport/surveyDocImages'
import type { SurveyDocOptions } from '../docExport/types'
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

const buildDocxImageParagraph = (image: SurveyDocImageData, spacingAfter?: number): Paragraph =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    ...(spacingAfter !== undefined ? { spacing: { after: spacingAfter } } : {}),
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
    children: [buildDocxImageParagraph(image)],
  })

const buildDocxImageFooter = (image: SurveyDocImageData): Footer =>
  new Footer({
    children: [buildDocxImageParagraph(image)],
  })

const generateSurveyDocx = async (options: SurveyDocxOptions): Promise<SurveyDocxResult> => {
  const { readOnly } = options
  const renderer = new DocxSurveyDocRenderer()
  const { elements, surveyName } = await walkSurvey(options, renderer)
  const { headerImage, footerImage } = await fetchSurveyDocImages(options)
  const headerOnFirstPageOnly = isHeaderOnFirstPageOnly(options)

  // When header is first-page-only, embed it as a body paragraph so pages 2+ keep only the
  // base top margin. When header repeats on all pages, use a DOCX header section with the
  // extra margin needed to accommodate it.
  const headerMarginTwips =
    headerImage && !headerOnFirstPageOnly ? imageHeightToTwips(headerImage.height) + DOCX_MARGIN_GAP_TWIPS : 0
  const footerMarginTwips = footerImage ? imageHeightToTwips(footerImage.height) + DOCX_MARGIN_GAP_TWIPS : 0

  const bodyChildren =
    headerImage && headerOnFirstPageOnly
      ? [buildDocxImageParagraph(headerImage, DOCX_MARGIN_GAP_TWIPS), ...elements]
      : elements

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
            margin: {
              top: DOCX_BASE_MARGIN_TWIPS + headerMarginTwips,
              bottom: DOCX_BASE_MARGIN_TWIPS + footerMarginTwips,
              left: 1080,
              right: 1080,
            },
          },
        },
        ...(headerImage && !headerOnFirstPageOnly ? { headers: { default: buildDocxImageHeader(headerImage) } } : {}),
        ...(footerImage ? { footers: { default: buildDocxImageFooter(footerImage) } } : {}),
        children: bodyChildren,
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
