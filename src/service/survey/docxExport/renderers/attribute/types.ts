import type { Paragraph, Table } from 'docx'

export type { RenderContext, RenderLimits, AttributeRendererArgs } from '../../../docExport/types'

export type DocChild = Paragraph | Table
export type AttributeRenderer = (args: import('../../../docExport/types').AttributeRendererArgs) => Promise<DocChild[]>
