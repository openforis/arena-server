import type { ArenaRecord, Node as ArenaNode, NodeDefEntity, NodeDefEntityChildPosition } from '@openforis/arena-core'
import { NodeDef, NodeDefType, NodeDefs, Records, Surveys } from '@openforis/arena-core'

import { formatNodeValue, getIsTableLayout, label } from './common'
import { DEFAULT_PRINT_ORIENTATION, resolvePrintOrientation } from './printOrientation'
import type { GridRow, SurveyDocRenderer } from './SurveyDocRenderer'
import type { PrintOrientation, RenderContext, SurveyDocOptions, SurveyDocSection } from './types'

// ─── Section Builder ───────────────────────────────────────────────────────────

class SectionBuilder<T> {
  private sections: SurveyDocSection<T>[] = []
  private current: SurveyDocSection<T>

  constructor(initial: PrintOrientation) {
    this.current = { orientation: initial, elements: [] }
  }

  push(...els: T[]): void {
    this.current.elements.push(...els)
  }

  ensureOrientation(next: PrintOrientation): void {
    if (next === this.current.orientation) return
    if (this.current.elements.length > 0) this.sections.push(this.current)
    this.current = { orientation: next, elements: [] }
  }

  finish(): SurveyDocSection<T>[] {
    if (this.current.elements.length > 0) this.sections.push(this.current)
    return this.sections
  }
}

interface WalkOptions<T> {
  includeOwnPageEntities?: boolean
  sectionBuilder?: SectionBuilder<T>
  documentDefault?: PrintOrientation
}

// ─── Relevance / Visibility Helper ───────────────────────────────────────────

const isNodeRelevantAndVisible = (record: ArenaRecord, node: ArenaNode): boolean =>
  Records.isNodeApplicable({ record, node }) && Records.isNodeVisible({ record, node })

// ─── Grid Helpers (shared with docx) ────────────────────────────────────────

type GridCell = { item: NodeDefEntityChildPosition; nodeDef: NodeDef<NodeDefType> | undefined }

const buildGrid = (
  layoutChildren: NodeDefEntityChildPosition[],
  childDefByUuid: Record<string, NodeDef<NodeDefType>>,
  maxX: number,
  maxY: number
): Array<Array<GridCell | null>> => {
  const grid: Array<Array<GridCell | null>> = Array.from({ length: maxY }, () => new Array(maxX).fill(null))
  for (const item of layoutChildren) {
    const nodeDef = childDefByUuid[item.i]
    if (!nodeDef) continue
    grid[item.y][item.x] = { item, nodeDef }
  }
  return grid
}

const markSpannedCells = (skip: boolean[][], x: number, y: number, w: number, h: number): void => {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      if (dy !== 0 || dx !== 0) skip[y + dy][x + dx] = true
    }
  }
}

// ─── Grid Walker ─────────────────────────────────────────────────────────────

const computeGridDimensions = (layoutChildren: NodeDefEntityChildPosition[]): { maxX: number; maxY: number } => {
  let maxX = 0
  let maxY = 0
  for (const item of layoutChildren) {
    maxX = Math.max(maxX, item.x + (item.w ?? 1))
    maxY = Math.max(maxY, item.y + (item.h ?? 1))
  }
  return { maxX, maxY }
}

const renderGridCellContent = async <T>(
  renderer: SurveyDocRenderer<T>,
  nodeDef: NodeDef<NodeDefType>,
  item: NodeDefEntityChildPosition,
  context: RenderContext,
  depth: number,
  parentEntityNode: ArenaNode | undefined,
  maxX: number,
  walkOptions?: WalkOptions<T>
): Promise<T[]> => {
  if (NodeDefs.isEntity(nodeDef)) {
    return walkEntityDef(renderer, nodeDef as NodeDefEntity, context, depth + 1, parentEntityNode, undefined, walkOptions)
  }
  if (NodeDefs.isHidden(nodeDef)) return []
  const { record } = context
  const limits = renderer.getGridCellLimits?.(maxX, item.w ?? 1)
  const childNode =
    record && parentEntityNode ? Records.getChildren(parentEntityNode, nodeDef.uuid)(record)[0] : undefined
  if (record && childNode && !isNodeRelevantAndVisible(record, childNode)) return []
  return renderer.renderAttribute({ nodeDef, context, depth, node: childNode, limits })
}

const walkEntityChildrenGrid = async <T>(
  renderer: SurveyDocRenderer<T>,
  entityDef: NodeDefEntity,
  context: RenderContext,
  depth: number,
  parentEntityNode?: ArenaNode,
  walkOptions?: WalkOptions<T>
): Promise<T[]> => {
  const { survey, cycle } = context
  const layoutChildren = NodeDefs.getLayoutChildren(cycle)(entityDef) as NodeDefEntityChildPosition[]

  const childDefByUuid = Object.fromEntries(
    Surveys.getNodeDefChildrenSorted({
      survey,
      nodeDef: entityDef,
      cycle,
      includeAnalysis: false,
      includeLayoutElements: true,
    }).map((def) => [def.uuid, def])
  )

  const { maxX, maxY } = computeGridDimensions(layoutChildren)
  const grid = buildGrid(layoutChildren, childDefByUuid, maxX, maxY)
  const skip: boolean[][] = Array.from({ length: maxY }, () => new Array(maxX).fill(false))

  type PendingCell = { promise: Promise<T[]>; colSpan?: number; rowSpan?: number }

  const gridRows: Array<GridRow<T>> = []
  for (let y = 0; y < maxY; y++) {
    const pending: PendingCell[] = []
    for (let x = 0; x < maxX; x++) {
      if (skip[y][x]) continue
      const cell = grid[y][x]
      if (!cell?.nodeDef) {
        pending.push({ promise: Promise.resolve([]) })
        continue
      }
      const { item, nodeDef } = cell
      const w = item.w ?? 1
      const h = item.h ?? 1
      markSpannedCells(skip, x, y, w, h)
      pending.push({
        promise: renderGridCellContent(renderer, nodeDef, item, context, depth, parentEntityNode, maxX, walkOptions),
        colSpan: w > 1 ? w : undefined,
        rowSpan: h > 1 ? h : undefined,
      })
    }
    const contents = await Promise.all(pending.map((p) => p.promise))
    gridRows.push(contents.map((content, i) => ({ content, colSpan: pending[i].colSpan, rowSpan: pending[i].rowSpan })))
  }

  return renderer.renderGridTable(gridRows, maxX)
}

// ─── Default (flat) Walker ────────────────────────────────────────────────────

const walkEntityChildrenDefault = async <T>(
  renderer: SurveyDocRenderer<T>,
  entityDef: NodeDef<NodeDefType>,
  context: RenderContext,
  depth: number,
  parentEntityNode?: ArenaNode,
  walkOptions?: WalkOptions<T>
): Promise<T[]> => {
  const { survey, cycle, record } = context
  const children = Surveys.getNodeDefChildrenSorted({
    survey,
    nodeDef: entityDef,
    cycle,
    includeAnalysis: false,
    includeLayoutElements: true,
  })
  const result: T[] = []
  for (const child of children) {
    if (NodeDefs.isEntity(child)) {
      result.push(
        ...(await walkEntityDef(renderer, child as NodeDefEntity, context, depth + 1, parentEntityNode, undefined, walkOptions))
      )
    } else {
      if (NodeDefs.isHidden(child)) continue
      let childNode: ArenaNode | undefined
      if (record && parentEntityNode) {
        childNode = Records.getChildren(parentEntityNode, child.uuid)(record)[0]
      }
      if (record && childNode && !isNodeRelevantAndVisible(record, childNode)) continue
      result.push(...(await renderer.renderAttribute({ nodeDef: child, context, depth, node: childNode })))
    }
  }
  return result
}

// ─── Entity Table Walker ─────────────────────────────────────────────────────

const walkEntityAsTable = <T>(
  renderer: SurveyDocRenderer<T>,
  entityDef: NodeDefEntity,
  context: RenderContext,
  parentEntityNode?: ArenaNode
): T[] => {
  const { survey, lang, cycle, record } = context
  const attrDefs = Surveys.getNodeDefChildrenSorted({
    survey,
    nodeDef: entityDef,
    cycle,
    includeAnalysis: false,
    includeLayoutElements: true,
  }).filter((def) => NodeDefs.isAttribute(def) && !NodeDefs.isHidden(def))

  const headers = attrDefs.map((attr) => label(attr, lang))

  let rows: string[][] = []
  if (record && parentEntityNode) {
    const entityNodes = Records.getChildren(
      parentEntityNode,
      entityDef.uuid
    )(record).filter((node) => isNodeRelevantAndVisible(record, node))
    if (entityNodes.length > 0) {
      rows = entityNodes.map((entityNode) =>
        attrDefs.map((attrDef) => {
          const attrNode = Records.getChildren(entityNode, attrDef.uuid)(record)[0]
          return attrNode ? formatNodeValue(attrDef, context, attrNode) : ''
        })
      )
    }
  }

  return renderer.renderEntityTable(headers, rows)
}

// ─── Children Dispatcher ─────────────────────────────────────────────────────

export const walkEntityChildren = async <T>(
  renderer: SurveyDocRenderer<T>,
  entityDef: NodeDefEntity,
  context: RenderContext,
  depth: number,
  parentEntityNode?: ArenaNode,
  walkOptions?: WalkOptions<T>
): Promise<T[]> => {
  const { survey, cycle } = context
  const childDefs = Surveys.getNodeDefChildrenSorted({
    survey,
    nodeDef: entityDef,
    cycle,
    includeAnalysis: false,
    includeLayoutElements: true,
  })
  const currentPageUuid = NodeDefs.getPageUuid(cycle)(entityDef)
  const entityDefsInOwnPage = childDefs.filter(
    (def) => NodeDefs.isEntity(def) && NodeDefs.getPageUuid(cycle)(def as NodeDefEntity) !== currentPageUuid
  ) as NodeDefEntity[]

  const layoutChildren = NodeDefs.getLayoutChildren(cycle)(entityDef)
  const result =
    layoutChildren.length > 0
      ? await walkEntityChildrenGrid(renderer, entityDef, context, depth, parentEntityNode, walkOptions)
      : await walkEntityChildrenDefault(renderer, entityDef, context, depth, parentEntityNode, walkOptions)

  if (walkOptions?.includeOwnPageEntities === false) {
    return result
  }

  const documentDefault = walkOptions?.documentDefault ?? DEFAULT_PRINT_ORIENTATION
  for (const childEntityDef of entityDefsInOwnPage) {
    const childOrientation = resolvePrintOrientation(childEntityDef, documentDefault)
    walkOptions?.sectionBuilder?.ensureOrientation(childOrientation)
    const childElements = await walkEntityDef(
      renderer,
      childEntityDef,
      context,
      depth + 1,
      parentEntityNode,
      true,
      walkOptions
    )
    if (walkOptions?.sectionBuilder) {
      walkOptions.sectionBuilder.push(...childElements)
    } else {
      result.push(...childElements)
    }
  }
  return result
}

// ─── Multiple Instance Walker ─────────────────────────────────────────────────

const walkEntityNodes = async <T>(
  renderer: SurveyDocRenderer<T>,
  entityNodes: ArenaNode[],
  entityDef: NodeDefEntity,
  context: RenderContext,
  depth: number,
  walkOptions?: WalkOptions<T>
): Promise<T[]> => {
  const { record } = context
  const visibleNodes = record ? entityNodes.filter((node) => isNodeRelevantAndVisible(record, node)) : entityNodes
  const result: T[] = []
  for (let index = 0; index < visibleNodes.length; index++) {
    const entityNode = visibleNodes[index]
    if (visibleNodes.length > 1) {
      result.push(...renderer.renderEntityInstanceHeading(`${label(entityDef, context.lang)} #${index + 1}`, depth))
    }
    result.push(...(await walkEntityChildren(renderer, entityDef, context, depth + 1, entityNode, walkOptions)))
  }
  return result
}

// ─── Main Entity Def Walker ───────────────────────────────────────────────────

export const walkEntityDef = async <T>(
  renderer: SurveyDocRenderer<T>,
  entityDef: NodeDefEntity,
  context: RenderContext,
  depth: number,
  parentEntityNode?: ArenaNode,
  hasOwnPage?: boolean,
  walkOptions?: WalkOptions<T>
): Promise<T[]> => {
  const { record } = context
  const isRoot = NodeDefs.isRoot(entityDef)
  const isMultiple = NodeDefs.isMultiple(entityDef)
  const isTableLayout = getIsTableLayout(entityDef, context.cycle)

  const entityNodes: ArenaNode[] =
    record && parentEntityNode ? Records.getChildren(parentEntityNode, entityDef.uuid)(record) : []

  if (!isRoot && record && entityNodes.length > 0 && !isMultiple && !isNodeRelevantAndVisible(record, entityNodes[0])) {
    return []
  }

  const result: T[] = []

  if (!isRoot) {
    result.push(
      ...renderer.renderEntityHeading(label(entityDef, context.lang), depth, (isMultiple && depth <= 2) || !!hasOwnPage)
    )
  }

  if (isMultiple && isTableLayout) {
    result.push(...walkEntityAsTable(renderer, entityDef, context, parentEntityNode))
  } else if (isMultiple) {
    if (entityNodes.length > 0) {
      result.push(...(await walkEntityNodes(renderer, entityNodes, entityDef, context, depth, walkOptions)))
    } else {
      result.push(...(await walkEntityChildren(renderer, entityDef, context, depth, parentEntityNode, walkOptions)))
    }
  } else {
    result.push(...(await walkEntityChildren(renderer, entityDef, context, depth, entityNodes[0], walkOptions)))
  }

  return result
}

// ─── Top-level Entry Point ────────────────────────────────────────────────────

const resolveCurrentPageEntity = (
  options: SurveyDocOptions,
  context: RenderContext
): { entityDef: NodeDefEntity; entityNode: ArenaNode } => {
  const { entityDefUuid, entityNodeUuid } = options
  if (!entityDefUuid || !entityNodeUuid) {
    throw new Error('Missing entityDefUuid and entityNodeUuid for current-page export')
  }
  const { survey, record } = context
  if (!record) {
    throw new Error('Record is required for current-page export')
  }
  const entityDef = Surveys.getNodeDefByUuid({ survey, uuid: entityDefUuid })
  const entityNode = Records.getNodeByUuid(entityNodeUuid)(record)
  if (!entityDef || !entityNode || !NodeDefs.isEntity(entityDef)) {
    throw new Error('Entity not found for current-page export')
  }
  return { entityDef: entityDef as NodeDefEntity, entityNode }
}

export const walkSurvey = async <T>(
  options: SurveyDocOptions,
  renderer: SurveyDocRenderer<T>
): Promise<{ sections: SurveyDocSection<T>[]; surveyName: string }> => {
  const { survey, i18n, record, fileProvider } = options
  const lang = options.lang ?? Surveys.getDefaultLanguage(survey)
  const cycle = options.cycle ?? Surveys.getDefaultCycleKey(survey) ?? Surveys.getLastCycleKey(survey)
  const context: RenderContext = { survey, lang, cycle, i18n, record, fileProvider }
  const documentDefault = options.orientation ?? DEFAULT_PRINT_ORIENTATION
  const exportScope = options.exportScope ?? 'full'

  const surveyName = Surveys.getName(survey)

  if (exportScope === 'currentPage') {
    const { entityDef, entityNode } = resolveCurrentPageEntity(options, context)
    const orientation = resolvePrintOrientation(entityDef, documentDefault)
    const entityLabel = label(entityDef, lang)
    const elements: T[] = [
      ...renderer.renderTitle(entityLabel, false),
      ...(await walkEntityChildren(renderer, entityDef, context, 0, entityNode, {
        includeOwnPageEntities: false,
        documentDefault,
      })),
    ]
    return { sections: [{ orientation, elements }], surveyName }
  }

  const surveyLabel = Surveys.getLabel(lang)(survey)
  const surveyDescription = Surveys.getDescription(lang)(survey)
  const rootDef = Surveys.getNodeDefRoot({ survey })
  const rootEntityNode = record ? Records.getRoot(record) : undefined
  const rootOrientation = resolvePrintOrientation(rootDef, documentDefault)
  const sectionBuilder = new SectionBuilder<T>(rootOrientation)
  const walkOptions: WalkOptions<T> = { sectionBuilder, documentDefault }

  sectionBuilder.push(...renderer.renderTitle(surveyLabel ?? surveyName, !!surveyDescription))
  if (surveyDescription) {
    sectionBuilder.push(...renderer.renderSubtitle(surveyDescription))
  }
  sectionBuilder.push(...(await walkEntityChildren(renderer, rootDef, context, 0, rootEntityNode, walkOptions)))

  return { sections: sectionBuilder.finish(), surveyName }
}
