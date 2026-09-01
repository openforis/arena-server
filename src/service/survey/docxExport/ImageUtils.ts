/**
 * Image utility functions for DOCX generation.
 * Handles image dimension extraction and scaling calculations.
 */

import sizeOf from 'image-size'

export const VALID_IMAGE_TYPES = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg']
export const MAX_IMAGE_WIDTH = 500
export const MAX_IMAGE_HEIGHT = 500

/**
 * Extracts image dimensions from buffer using the image-size library.
 * Supports PNG, JPEG, GIF, BMP, WEBP, SVG, TIFF, and other formats.
 */
export const getImageDimensions = (buffer: Buffer): { width: number; height: number } | null => {
  try {
    const result = sizeOf(buffer)
    const { width, height } = result ?? {}
    return width && height ? { width, height } : null
  } catch {
    return null
  }
}

/**
 * Calculates scaled image dimensions maintaining aspect ratio while constraining to max width/height.
 */
export const calculateScaledDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number = MAX_IMAGE_WIDTH,
  maxHeight: number = MAX_IMAGE_HEIGHT
): { width: number; height: number } => {
  let width = originalWidth
  let height = originalHeight
  const aspectRatio = originalWidth / originalHeight

  // Scale down if exceeds max width
  if (width > maxWidth) {
    width = maxWidth
    height = Math.round(maxWidth / aspectRatio)
  }

  // Scale down if exceeds max height
  if (height > maxHeight) {
    height = maxHeight
    width = Math.round(maxHeight * aspectRatio)
  }

  return { width, height }
}
