import type {
  ArenaRecord,
  I18n,
  LanguageCode,
  Node as ArenaNode,
  NodeDef,
  NodeDefType,
  Survey,
} from '@openforis/arena-core'

export type PrintOrientation = 'portrait' | 'landscape'
export type SurveyDocExportScope = 'full' | 'currentPage'

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
  /** Export scope; defaults to full survey. */
  exportScope?: SurveyDocExportScope
  /** Entity definition UUID for current-page export. */
  entityDefUuid?: string
  /** Entity node UUID for current-page export. */
  entityNodeUuid?: string
  /** Document default print orientation; defaults to portrait. */
  orientation?: PrintOrientation
}

export interface SurveyDocSection<T> {
  orientation: PrintOrientation
  elements: T[]
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
