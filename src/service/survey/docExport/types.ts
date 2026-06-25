import type {
  ArenaRecord,
  I18n,
  LanguageCode,
  Node as ArenaNode,
  NodeDef,
  NodeDefType,
  Survey,
} from '@openforis/arena-core'

export interface SurveyDocOptions {
  survey: Survey
  cycle?: string
  lang?: LanguageCode
  i18n: I18n
  record?: ArenaRecord
  fileProvider?: (fileUuid: string) => Promise<Buffer>
  headerImageFileUuid?: string
  footerImageFileUuid?: string
  /** When true (default), the header image appears only on the first page. */
  headerOnFirstPageOnly?: boolean
  /** When false, page numbers are suppressed; defaults to true. */
  pageNumbering?: boolean
}

export interface RenderContext {
  survey: Survey
  lang: LanguageCode
  cycle: string
  i18n: I18n
  record?: ArenaRecord
  fileProvider?: (fileUuid: string) => Promise<Buffer>
}

export interface RenderLimits {
  maxImageWidth?: number
  maxImageHeight?: number
}

export interface AttributeRendererArgs {
  nodeDef: NodeDef<NodeDefType>
  context: RenderContext
  depth: number
  node?: ArenaNode
  limits?: RenderLimits
}
