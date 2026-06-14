import type { AttributeRendererArgs, RenderLimits } from './types'

export interface GridCellContent<T> {
  content: T[]
  colSpan?: number
  rowSpan?: number
}

export type GridRow<T> = Array<GridCellContent<T>>

export interface SurveyDocRenderer<T> {
  renderTitle(text: string, hasSubtitle: boolean): T[]
  renderSubtitle(text: string): T[]
  renderEntityHeading(text: string, depth: number, pageBreak: boolean): T[]
  renderEntityInstanceHeading(text: string, depth: number): T[]
  renderAttribute(args: AttributeRendererArgs): Promise<T[]>
  renderGridTable(rows: Array<GridRow<T>>): T[]
  renderEntityTable(headers: string[], rows: string[][]): T[]
  getGridCellLimits?(columnCount: number, columnSpan: number): RenderLimits | undefined
}
