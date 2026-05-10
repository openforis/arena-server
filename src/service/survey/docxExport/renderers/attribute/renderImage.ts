import { ImageRun, Paragraph } from 'docx'

import { MAX_IMAGE_HEIGHT, MAX_IMAGE_WIDTH, calculateScaledDimensions, getImageDimensions } from '../../ImageUtils'
import { formItemLabelRun, SPACING_FIELD_ROW } from './common'
import type { RenderLimits } from './types'

type DocxImageType = 'jpg' | 'png' | 'gif' | 'bmp'

const DOCX_IMAGE_TYPE_BY_EXTENSION: Record<string, DocxImageType> = {
  jpg: 'jpg',
  jpeg: 'jpg',
  png: 'png',
  gif: 'gif',
  bmp: 'bmp',
}

const getDocxImageTypeFromFileName = (fileName: string): DocxImageType | undefined => {
  const extension = fileName.split('.').pop()?.toLowerCase()
  return extension ? DOCX_IMAGE_TYPE_BY_EXTENSION[extension] : undefined
}

export const renderImage = (
  fileName: string,
  itemLabel: string,
  buffer: Buffer<ArrayBufferLike>,
  limits?: RenderLimits
): Paragraph[] | null => {
  const imgType = getDocxImageTypeFromFileName(fileName)
  if (!imgType) {
    return null
  }

  const maxWidth = limits?.maxImageWidth ?? MAX_IMAGE_WIDTH
  const maxHeight = limits?.maxImageHeight ?? MAX_IMAGE_HEIGHT

  const dims = getImageDimensions(buffer as Buffer)
  const transformation = dims
    ? calculateScaledDimensions(dims.width, dims.height, maxWidth, maxHeight)
    : { width: maxWidth, height: maxHeight }

  return [
    new Paragraph({
      spacing: { before: 80, after: 80 },
      children: [formItemLabelRun(itemLabel)],
    }),
    new Paragraph({
      spacing: SPACING_FIELD_ROW,
      children: [
        new ImageRun({
          data: buffer,
          type: imgType,
          transformation,
        }),
      ],
    }),
  ]
}
