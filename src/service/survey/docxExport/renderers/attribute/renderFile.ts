import { Paragraph, TextRun } from 'docx'

import { NodeValues } from '@openforis/arena-core'

import { isNodeBlank, label, nodeDefFormItemLabelRun, SPACING_FIELD_ROW, valueRow } from './common'
import { renderImage } from './renderImage'
import type { AttributeRenderer, RenderContext } from './types'

const getFileNameToDisplay = (node?: Parameters<AttributeRenderer>[0]['node']): string =>
  node
    ? (NodeValues.getFileNameCalculated(node) ?? NodeValues.getFileName(node) ?? '[attached file]')
    : '[attached file]'

const renderFilePlaceholder = (
  nodeDef: Parameters<AttributeRenderer>[0]['nodeDef'],
  context: Parameters<AttributeRenderer>[0]['context']
): Paragraph[] => [
  new Paragraph({
    spacing: SPACING_FIELD_ROW,
    children: [
      nodeDefFormItemLabelRun(nodeDef, context),
      new TextRun({ text: '[file attachment]', italics: true, color: '888888' }),
    ],
  }),
]

const tryRenderImageFile = async ({
  context,
  nodeDef,
  node,
  limits,
}: {
  context: RenderContext
  nodeDef: Parameters<AttributeRenderer>[0]['nodeDef']
  node: NonNullable<Parameters<AttributeRenderer>[0]['node']>
  limits: Parameters<AttributeRenderer>[0]['limits']
}): Promise<Paragraph[] | null> => {
  const lbl = label(nodeDef, context.lang)

  const fileNameToDisplay = getFileNameToDisplay(node)
  const fileProvider = context.fileProvider
  if (!fileProvider) return null

  const fileUuid = NodeValues.getFileUuid(node)
  if (!fileUuid) return null

  try {
    const fileData = await fileProvider(fileUuid)
    const buffer = typeof fileData === 'string' ? Buffer.from(fileData) : fileData
    const fileName = NodeValues.getFileName(node) ?? fileUuid
    const imageParagraphs = renderImage(fileName, lbl, buffer, limits)
    return imageParagraphs ?? [valueRow(lbl, fileNameToDisplay)]
  } catch {
    return [valueRow(lbl, fileNameToDisplay)]
  }
}

export const renderFile: AttributeRenderer = async ({ nodeDef, context, node, limits }) => {
  const lbl = label(nodeDef, context.lang)

  if (isNodeBlank(node)) {
    if (context.record) {
      return [valueRow(lbl, '')]
    }
    return renderFilePlaceholder(nodeDef, context)
  }

  const nodeDefFile = nodeDef as typeof nodeDef & { props?: { fileType?: string } }
  if (nodeDefFile.props?.fileType === 'image') {
    const imageParagraphs = await tryRenderImageFile({ nodeDef, context, node: node!, limits })
    if (imageParagraphs) {
      return imageParagraphs
    }
  }

  return [valueRow(lbl, getFileNameToDisplay(node))]
}
