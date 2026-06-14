import type { Node as ArenaNode, NodeDefEntity, NodeDefEntityChildPosition } from '@openforis/arena-core'
import { NodeDef, NodeDefType, NodeDefs, Records, Surveys } from '@openforis/arena-core'

import { formatNodeValue, getIsTableLayout, label } from './common'
import type { GridRow, SurveyDocRenderer } from './SurveyDocRenderer'
import type { RenderContext, SurveyDocOptions } from './types'

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
  maxX: number
): Promise<T[]> => {
  if (NodeDefs.isEntity(nodeDef)) {
    return walkEntityDef(renderer, nodeDef as NodeDefEntity, context, depth + 1, parentEntityNode)
  }
  const { record } = context
  const limits = renderer.getGridCellLimits?.(maxX, item.w ?? 1)
  const childNode =
    record && parentEntityNode ? Records.getChildren(parentEntityNode, nodeDef.uuid)(record)[0] : undefined
  return renderer.renderAttribute({ nodeDef, context, depth, node: childNode, limits })
}

const walkEntityChildrenGrid = async <T>(
  renderer: SurveyDocRenderer<T>,
  entityDef: NodeDefEntity,
  context: RenderContext,
  depth: number,
  parentEntityNode?: ArenaNode
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

  const gridRows: Array<GridRow<T>> = []
  for (let y = 0; y < maxY; y++) {
    const row: GridRow<T> = []
    for (let x = 0; x < maxX; x++) {
      if (skip[y][x]) continue
      const cell = grid[y][x]
      if (!cell?.nodeDef) {
        row.push({ content: [] })
        continue
      }
      const { item, nodeDef } = cell
      const w = item.w ?? 1
      const h = item.h ?? 1
      markSpannedCells(skip, x, y, w, h)
      const content = await renderGridCellContent(renderer, nodeDef, item, context, depth, parentEntityNode, maxX)
      row.push({ content, colSpan: w > 1 ? w : undefined, rowSpan: h > 1 ? h : undefined })
    }
    gridRows.push(row)
  }

  return renderer.renderGridTable(gridRows, maxX)
}

// ─── Default (flat) Walker ────────────────────────────────────────────────────

const walkEntityChildrenDefault = async <T>(
  renderer: SurveyDocRenderer<T>,
  entityDef: NodeDef<NodeDefType>,
  context: RenderContext,
  depth: number,
  parentEntityNode?: ArenaNode
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
      result.push(...(await walkEntityDef(renderer, child as NodeDefEntity, context, depth + 1, parentEntityNode)))
    } else {
      let childNode: ArenaNode | undefined
      if (record && parentEntityNode) {
        childNode = Records.getChildren(parentEntityNode, child.uuid)(record)[0]
      }
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
  }).filter(NodeDefs.isAttribute)

  const headers = attrDefs.map((attr) => label(attr, lang))

  let rows: string[][] = []
  if (record && parentEntityNode) {
    const entityNodes = Records.getChildren(parentEntityNode, entityDef.uuid)(record)
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
  parentEntityNode?: ArenaNode
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
      ? await walkEntityChildrenGrid(renderer, entityDef, context, depth, parentEntityNode)
      : await walkEntityChildrenDefault(renderer, entityDef, context, depth, parentEntityNode)

  for (const childEntityDef of entityDefsInOwnPage) {
    result.push(...(await walkEntityDef(renderer, childEntityDef, context, depth + 1, parentEntityNode)))
  }
  return result
}

// ─── Multiple Instance Walker ─────────────────────────────────────────────────

const walkEntityNodes = async <T>(
  renderer: SurveyDocRenderer<T>,
  entityNodes: ArenaNode[],
  entityDef: NodeDefEntity,
  context: RenderContext,
  depth: number
): Promise<T[]> => {
  const result: T[] = []
  for (let index = 0; index < entityNodes.length; index++) {
    const entityNode = entityNodes[index]
    if (entityNodes.length > 1) {
      result.push(...renderer.renderEntityInstanceHeading(`${label(entityDef, context.lang)} #${index + 1}`, depth))
    }
    result.push(...(await walkEntityChildren(renderer, entityDef, context, depth + 1, entityNode)))
  }
  return result
}

// ─── Main Entity Def Walker ───────────────────────────────────────────────────

export const walkEntityDef = async <T>(
  renderer: SurveyDocRenderer<T>,
  entityDef: NodeDefEntity,
  context: RenderContext,
  depth: number,
  parentEntityNode?: ArenaNode
): Promise<T[]> => {
  const { record } = context
  const isRoot = NodeDefs.isRoot(entityDef)
  const isMultiple = NodeDefs.isMultiple(entityDef)
  const isTableLayout = getIsTableLayout(entityDef, context.cycle)

  const entityNodes: ArenaNode[] =
    record && parentEntityNode ? Records.getChildren(parentEntityNode, entityDef.uuid)(record) : []

  const result: T[] = []

  if (!isRoot) {
    result.push(...renderer.renderEntityHeading(label(entityDef, context.lang), depth, isMultiple && depth <= 2))
  }

  if (isMultiple && isTableLayout) {
    result.push(...walkEntityAsTable(renderer, entityDef, context, parentEntityNode))
  } else if (isMultiple) {
    if (entityNodes.length > 0) {
      result.push(...(await walkEntityNodes(renderer, entityNodes, entityDef, context, depth)))
    } else {
      result.push(...(await walkEntityChildren(renderer, entityDef, context, depth, parentEntityNode)))
    }
  } else {
    result.push(...(await walkEntityChildren(renderer, entityDef, context, depth, entityNodes[0])))
  }

  return result
}

// ─── Top-level Entry Point ────────────────────────────────────────────────────

export const walkSurvey = async <T>(
  options: SurveyDocOptions,
  renderer: SurveyDocRenderer<T>
): Promise<{ elements: T[]; surveyName: string }> => {
  const { survey, i18n, record, fileProvider } = options
  const lang = options.lang ?? Surveys.getDefaultLanguage(survey)
  const cycle = options.cycle ?? Surveys.getDefaultCycleKey(survey) ?? Surveys.getLastCycleKey(survey)
  const context: RenderContext = { survey, lang, cycle, i18n, record, fileProvider }

  const surveyName = Surveys.getName(survey)
  const surveyLabel = Surveys.getLabel(lang)(survey)
  const surveyDescription = Surveys.getDescription(lang)(survey)

  const rootDef = Surveys.getNodeDefRoot({ survey })
  const rootEntityNode = record ? Records.getRoot(record) : undefined

  const elements: T[] = []
  elements.push(...renderer.renderTitle(surveyLabel ?? surveyName, !!surveyDescription))
  if (surveyDescription) {
    elements.push(...renderer.renderSubtitle(surveyDescription))
  }
  elements.push(...(await walkEntityChildren(renderer, rootDef, context, 0, rootEntityNode)))

  return { elements, surveyName }
}
