import {
  AlignmentType,
  Document,
  Footer,
  Header,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  Tab,
  TabStopPosition,
  TabStopType,
  TextRun,
} from 'docx'

import {
  DOCX_BASE_MARGIN_TWIPS,
  DOCX_MARGIN_GAP_TWIPS,
  fetchSurveyDocImages,
  imageHeightToTwips,
  isHeaderOnFirstPageOnly,
  isPageNumberingEnabled,
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

// Extra twips reserved for the page-number text row when it shares the footer with an image.
const PAGE_NUMBER_ROW_TWIPS = 240

const buildDocxImageParagraph = (image: SurveyDocImageData, spacingAfter?: number): Paragraph =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    ...(spacingAfter === undefined ? {} : { spacing: { after: spacingAfter } }),
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

const buildPageNumberParagraph = (): Paragraph =>
  new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    children: [new TextRun({ children: [new Tab(), PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES] })],
  })

const buildDocxImageHeader = (image: SurveyDocImageData): Header =>
  new Header({ children: [buildDocxImageParagraph(image)] })

const buildDocxImageFooter = (image: SurveyDocImageData): Footer =>
  new Footer({ children: [buildDocxImageParagraph(image)] })

const buildDocxPageNumberFooter = (): Footer => new Footer({ children: [buildPageNumberParagraph()] })

const buildDocxImageAndPageNumberFooter = (image: SurveyDocImageData): Footer =>
  new Footer({ children: [buildDocxImageParagraph(image), buildPageNumberParagraph()] })

const calcFooterMarginTwips = (footerImage: SurveyDocImageData | undefined, pageNumbering: boolean): number => {
  const imageHeight = footerImage ? imageHeightToTwips(footerImage.height) + DOCX_MARGIN_GAP_TWIPS : 0
  return imageHeight + (pageNumbering ? PAGE_NUMBER_ROW_TWIPS : 0)
}

const generateSurveyDocx = async (options: SurveyDocxOptions): Promise<SurveyDocxResult> => {
  const { readOnly } = options
  const pageNumbering = isPageNumberingEnabled(options)
  const renderer = new DocxSurveyDocRenderer()
  const { elements, surveyName } = await walkSurvey(options, renderer)
  const { headerImage, footerImage } = await fetchSurveyDocImages(options)
  const headerOnFirstPageOnly = isHeaderOnFirstPageOnly(options)

  // When header is first-page-only, embed it as a body paragraph so pages 2+ keep only the
  // base top margin. When header repeats on all pages, use a DOCX header section with the
  // extra margin needed to accommodate it.
  const allPagesImageInHeader = Boolean(headerImage && !headerOnFirstPageOnly)
  const headerMarginTwips = allPagesImageInHeader ? imageHeightToTwips(headerImage!.height) + DOCX_MARGIN_GAP_TWIPS : 0
  const footerMarginTwips = calcFooterMarginTwips(footerImage, pageNumbering)

  const bodyChildren =
    headerImage && headerOnFirstPageOnly
      ? [buildDocxImageParagraph(headerImage, DOCX_MARGIN_GAP_TWIPS), ...elements]
      : elements

  // Build the headers object for the section.
  const headersConfig: { first?: Header; default?: Header } = {}
  if (allPagesImageInHeader) {
    headersConfig.default = buildDocxImageHeader(headerImage!)
  }

  // Build the footers object for the section.
  // titlePage: true gives page 1 its own footer slot; pages 2+ use "default".
  // This suppresses the page number on page 1 while showing it from page 2 onward.
  const footersConfig: { first?: Footer; default?: Footer } = {}
  if (pageNumbering) {
    if (footerImage) {
      footersConfig.first = buildDocxImageFooter(footerImage)
      footersConfig.default = buildDocxImageAndPageNumberFooter(footerImage)
    } else {
      footersConfig.default = buildDocxPageNumberFooter()
    }
  } else if (footerImage) {
    footersConfig.default = buildDocxImageFooter(footerImage)
  }

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
          ...(pageNumbering ? { titlePage: true } : {}),
        },
        ...(Object.keys(headersConfig).length > 0 ? { headers: headersConfig } : {}),
        ...(Object.keys(footersConfig).length > 0 ? { footers: footersConfig } : {}),
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
