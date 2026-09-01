import {
  AlignmentType,
  Document,
  Footer,
  Header,
  ImageRun,
  Packer,
  PageNumber,
  PageOrientation,
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
import { DEFAULT_PRINT_ORIENTATION } from '../docExport/printOrientation'
import type { PrintOrientation, SurveyDocOptions, SurveyDocSection } from '../docExport/types'
import { walkSurvey } from '../docExport/SurveyDocWalker'
import { DocxSurveyDocRenderer } from './DocxSurveyDocRenderer'
import type { DocChild } from './renderers/attribute'
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

const toDocxOrientation = (orientation: PrintOrientation): (typeof PageOrientation)[keyof typeof PageOrientation] =>
  orientation === 'landscape' ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT

const buildHeadersConfig = (
  headerImage: SurveyDocImageData | undefined,
  allPagesImageInHeader: boolean
): { first?: Header; default?: Header } => {
  if (!allPagesImageInHeader || !headerImage) return {}
  return { default: buildDocxImageHeader(headerImage) }
}

/**
 * Builds footer slots for a DOCX section.
 * On the first section, page 1 uses the "first" footer (no page number) when numbering is enabled.
 */
const buildFootersConfig = (
  footerImage: SurveyDocImageData | undefined,
  pageNumbering: boolean,
  isFirstSection: boolean
): { first?: Footer; default?: Footer } => {
  if (pageNumbering) {
    if (footerImage) {
      return {
        ...(isFirstSection ? { first: buildDocxImageFooter(footerImage) } : {}),
        default: buildDocxImageAndPageNumberFooter(footerImage),
      }
    }
    return { default: buildDocxPageNumberFooter() }
  }
  if (footerImage) {
    return { default: buildDocxImageFooter(footerImage) }
  }
  return {}
}

const generateSurveyDocx = async (options: SurveyDocxOptions): Promise<SurveyDocxResult> => {
  const { readOnly } = options
  const pageNumbering = isPageNumberingEnabled(options)
  const renderer = new DocxSurveyDocRenderer()
  const { sections, surveyName } = await walkSurvey(options, renderer)
  const documentDefault = options.orientation ?? DEFAULT_PRINT_ORIENTATION
  const docSections: SurveyDocSection<DocChild>[] =
    sections.length > 0 ? sections : [{ orientation: documentDefault, elements: [] }]
  const { headerImage, footerImage } = await fetchSurveyDocImages(options)
  const headerOnFirstPageOnly = isHeaderOnFirstPageOnly(options)

  // When header is first-page-only, embed it as a body paragraph so pages 2+ keep only the
  // base top margin. When header repeats on all pages, use a DOCX header section with the
  // extra margin needed to accommodate it.
  const allPagesImageInHeader = Boolean(headerImage && !headerOnFirstPageOnly)
  const headerMarginTwips = allPagesImageInHeader ? imageHeightToTwips(headerImage!.height) + DOCX_MARGIN_GAP_TWIPS : 0
  const footerMarginTwips = calcFooterMarginTwips(footerImage, pageNumbering)
  const headersConfig = buildHeadersConfig(headerImage, allPagesImageInHeader)

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
    sections: docSections.map((section, index) => {
      const isFirstSection = index === 0
      const footersConfig = buildFootersConfig(footerImage, pageNumbering, isFirstSection)
      const topMargin =
        DOCX_BASE_MARGIN_TWIPS + (isFirstSection || !headerOnFirstPageOnly ? headerMarginTwips : 0)
      const sectionChildren =
        isFirstSection && headerImage && headerOnFirstPageOnly
          ? [buildDocxImageParagraph(headerImage, DOCX_MARGIN_GAP_TWIPS), ...section.elements]
          : section.elements

      return {
        properties: {
          page: {
            size: {
              orientation: toDocxOrientation(section.orientation),
            },
            margin: {
              top: topMargin,
              bottom: DOCX_BASE_MARGIN_TWIPS + footerMarginTwips,
              left: 1080,
              right: 1080,
            },
          },
          ...(pageNumbering && isFirstSection ? { titlePage: true } : {}),
        },
        ...(Object.keys(headersConfig).length > 0 ? { headers: headersConfig } : {}),
        ...(Object.keys(footersConfig).length > 0 ? { footers: footersConfig } : {}),
        children: sectionChildren,
      }
    }),
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
