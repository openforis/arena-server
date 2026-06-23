import sizeOf from 'image-size'

import { calculateScaledDimensions, getImageDimensions } from '../docxExport/ImageUtils'
import type { SurveyDocOptions } from './types'

type DocxImageType = 'jpg' | 'png' | 'gif' | 'bmp'

const DOCX_IMAGE_TYPE_BY_FORMAT: Record<string, DocxImageType> = {
  jpg: 'jpg',
  jpeg: 'jpg',
  png: 'png',
  gif: 'gif',
  bmp: 'bmp',
}

export const DOC_CONTENT_MAX_WIDTH = 650
export const DOC_HEADER_FOOTER_MAX_HEIGHT = 120

export interface SurveyDocImageData {
  buffer: Buffer
  width: number
  height: number
  docxType: DocxImageType
}

const getDocxImageTypeFromBuffer = (buffer: Buffer): DocxImageType | undefined => {
  const format = sizeOf(buffer).type?.toLowerCase()
  return format ? DOCX_IMAGE_TYPE_BY_FORMAT[format] : undefined
}

const fetchSurveyDocImage = async (
  fileUuid: string | undefined,
  fileProvider: SurveyDocOptions['fileProvider'],
  maxWidth: number,
  maxHeight: number
): Promise<SurveyDocImageData | undefined> => {
  if (!fileUuid || !fileProvider) {
    return undefined
  }

  try {
    const buffer = await fileProvider(fileUuid)
    const docxType = getDocxImageTypeFromBuffer(buffer)
    if (!docxType) {
      return undefined
    }

    const dims = getImageDimensions(buffer)
    const transformation = dims
      ? calculateScaledDimensions(dims.width, dims.height, maxWidth, maxHeight)
      : { width: maxWidth, height: maxHeight }

    return {
      buffer,
      width: transformation.width,
      height: transformation.height,
      docxType,
    }
  } catch {
    return undefined
  }
}

export const fetchSurveyDocImages = async (
  options: Pick<SurveyDocOptions, 'fileProvider' | 'headerImageFileUuid' | 'footerImageFileUuid'>,
  limits: { maxWidth: number; maxHeight?: number } = {
    maxWidth: DOC_CONTENT_MAX_WIDTH,
    maxHeight: DOC_HEADER_FOOTER_MAX_HEIGHT,
  }
): Promise<{ headerImage?: SurveyDocImageData; footerImage?: SurveyDocImageData }> => {
  const { fileProvider, headerImageFileUuid, footerImageFileUuid } = options
  const maxHeight = limits.maxHeight ?? DOC_HEADER_FOOTER_MAX_HEIGHT
  const [headerImage, footerImage] = await Promise.all([
    fetchSurveyDocImage(headerImageFileUuid, fileProvider, limits.maxWidth, maxHeight),
    fetchSurveyDocImage(footerImageFileUuid, fileProvider, limits.maxWidth, maxHeight),
  ])

  return { headerImage, footerImage }
}
