import type { Paragraph, Table } from 'docx'

import type {
  Node as ArenaNode,
  ArenaRecord,
  I18n,
  LanguageCode,
  NodeDef,
  NodeDefType,
  Survey,
} from '@openforis/arena-core'

export interface RenderContext {
  survey: Survey
  lang: LanguageCode
  cycle: string
  i18n: I18n
  record?: ArenaRecord
  fileProvider?: (fileUuid: string) => Promise<Buffer | string>
}

export type DocChild = Paragraph | Table
export type RenderLimits = { maxImageWidth?: number; maxImageHeight?: number }

export type AttributeRendererArgs = {
  nodeDef: NodeDef<NodeDefType>
  context: RenderContext
  depth: number
  node?: ArenaNode
  limits?: RenderLimits
}

export type AttributeRenderer = (args: AttributeRendererArgs) => Promise<DocChild[]>
