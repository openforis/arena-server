import { HeadingLevel, Paragraph, Table, TableCell, TableRow } from 'docx'

import type { Node as ArenaNode, NodeDefEntity, NodeDefEntityChildPosition } from '@openforis/arena-core'
import { NodeDef, NodeDefEntityRenderType, NodeDefType, NodeDefs, Records, Surveys } from '@openforis/arena-core'

import { MAX_IMAGE_HEIGHT } from '../../ImageUtils'
import type { DocChild, RenderContext, RenderLimits } from '../attribute'
import { renderAttributeByType } from '../attribute'
import { label } from '../attribute/common'
import {
  TABLE_MAX_AVAILABLE_WIDTH,
  TABLE_BORDERS_NONE,
  getMaxImageWidthForGridCell,
  renderEntityAsTable,
  type GridCell,
} from './renderEntityTable'

// ─── Heading Utilities ────────────────────────────────────────────────────────

const headingLevels = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
]

export const headingForDepth = (depth: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] =>
  headingLevels[Math.min(depth, headingLevels.length - 1)]

// ─── Attribute Renderer Wrapper ────────────────────────────────────────────────

const renderAttribute = async (
  nodeDef: NodeDef<NodeDefType>,
  context: RenderContext,
  depth: number,
  node?: ArenaNode,
  limits?: RenderLimits
): Promise<DocChild[]> => renderAttributeByType({ nodeDef, context, depth, node, limits })

// ─── Grid Helper Functions ────────────────────────────────────────────────────

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
      if (dy !== 0 || dx !== 0) {
        skip[y + dy][x + dx] = true
      }
    }
  }
}

// ─── Grid Renderer ──────────────────────────────────────────────────────────

const buildTableRows = async ({
  grid,
  skip,
  maxX,
  maxY,
  context,
  depth,
  parentEntityNode,
  record,
}: {
  grid: Array<Array<GridCell | null>>
  skip: boolean[][]
  maxX: number
  maxY: number
  context: RenderContext
  depth: number
  parentEntityNode: ArenaNode | undefined
  record: any
}): Promise<TableRow[]> => {
  const renderCell = async (cell: GridCell | null, x: number, y: number): Promise<TableCell> => {
    if (!cell?.nodeDef) {
      return new TableCell({ children: [new Paragraph({ text: '' })] })
    }
    const { item, nodeDef } = cell
    const w = item.w ?? 1
    const h = item.h ?? 1
    const limits: RenderLimits = {
      maxImageWidth: getMaxImageWidthForGridCell(maxX, w),
      maxImageHeight: MAX_IMAGE_HEIGHT,
    }
    markSpannedCells(skip, x, y, w, h)
    let childNode: ArenaNode | undefined
    if (record && parentEntityNode) {
      childNode = Records.getChildren(parentEntityNode, nodeDef.uuid)(record)[0]
    }
    const rendered = NodeDefs.isEntity(nodeDef)
      ? await renderEntityDef(nodeDef as NodeDefEntity, context, depth + 1, parentEntityNode)
      : await renderAttribute(nodeDef, context, depth, childNode, limits)
    return new TableCell({
      children: Array.isArray(rendered) ? rendered : [rendered],
      columnSpan: w > 1 ? w : undefined,
      rowSpan: h > 1 ? h : undefined,
    })
  }

  const tableRows: TableRow[] = []
  for (let y = 0; y < maxY; y++) {
    const rowCellPromises: Promise<TableCell>[] = []
    for (let x = 0; x < maxX; x++) {
      if (skip[y][x]) continue
      rowCellPromises.push(renderCell(grid[y][x], x, y))
    }
    const rowCells = await Promise.all(rowCellPromises)
    tableRows.push(new TableRow({ children: rowCells }))
  }
  return tableRows
}

const renderEntityChildrenGrid = async (
  entityDef: NodeDefEntity,
  context: RenderContext,
  depth: number,
  parentEntityNode?: ArenaNode
): Promise<DocChild[]> => {
  const { survey, cycle, record } = context
  const layoutChildren: NodeDefEntityChildPosition[] = NodeDefs.getLayoutChildren(cycle)(
    entityDef
  ) as NodeDefEntityChildPosition[]
  // Map child uuid to nodeDef
  const childDefByUuid: Record<string, NodeDef<NodeDefType>> = {}
  const childDefs = Surveys.getNodeDefChildrenSorted({
    survey,
    nodeDef: entityDef,
    cycle,
    includeAnalysis: false,
    includeLayoutElements: true,
  })
  for (const def of childDefs) {
    childDefByUuid[def.uuid] = def
  }
  // Determine grid size
  let maxX = 0,
    maxY = 0
  for (const item of layoutChildren) {
    const w = item.w ?? 1
    const h = item.h ?? 1
    maxX = Math.max(maxX, item.x + w)
    maxY = Math.max(maxY, item.y + h)
  }
  // Build grid
  const grid = buildGrid(layoutChildren, childDefByUuid, maxX, maxY)
  // Track merged cells
  const skip: boolean[][] = Array.from({ length: maxY }, () => new Array(maxX).fill(false))
  // Build TableRows
  const tableRows = await buildTableRows({
    grid,
    skip,
    maxX,
    maxY,
    context,
    depth,
    parentEntityNode,
    record,
  })
  return [
    new Table({
      width: TABLE_MAX_AVAILABLE_WIDTH,
      rows: tableRows,
      borders: TABLE_BORDERS_NONE,
    }),
  ]
}

// ─── Default Flat Renderer ───────────────────────────────────────────────────────

/**
 * Renders entity children in a flat/default layout (no grid).
 * Recursively renders all child entities and attributes.
 */
const renderEntityChildrenDefault = async (
  entityDef: NodeDef<NodeDefType>,
  context: RenderContext,
  depth: number,
  parentEntityNode?: ArenaNode
): Promise<DocChild[]> => {
  const { survey, cycle, record } = context
  const children = Surveys.getNodeDefChildrenSorted({
    survey,
    nodeDef: entityDef,
    cycle,
    includeAnalysis: false,
    includeLayoutElements: true,
  })
  const result: DocChild[] = []
  for (const child of children) {
    if (NodeDefs.isEntity(child)) {
      result.push(...(await renderEntityDef(child as NodeDefEntity, context, depth + 1, parentEntityNode)))
    } else {
      let childNode: ArenaNode | undefined
      if (record && parentEntityNode) {
        childNode = Records.getChildren(parentEntityNode, child.uuid)(record)[0]
      }
      result.push(...(await renderAttribute(child, context, depth, childNode)))
    }
  }
  return result
}

// ─── Children Dispatcher ──────────────────────────────────────────────────────────

/**
 * Renders entity children, selecting between grid layout (if defined) or default flat layout.
 * Also handles child entities that are in their own page.
 */
export const renderEntityChildren = async (
  entityDef: NodeDefEntity,
  context: RenderContext,
  depth: number,
  parentEntityNode?: ArenaNode
): Promise<DocChild[]> => {
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
  let result: DocChild[]
  if (layoutChildren.length > 0) {
    result = await renderEntityChildrenGrid(entityDef, context, depth, parentEntityNode)
  } else {
    result = await renderEntityChildrenDefault(entityDef, context, depth, parentEntityNode)
  }

  // Render each entityDefInOwnPage in a separate page with a title
  for (const childEntityDef of entityDefsInOwnPage) {
    result.push(...(await renderEntityDef(childEntityDef, context, depth + 1, parentEntityNode)))
  }
  return result
}

// ─── Multiple Entity Nodes Renderer ────────────────────────────────────────────────

/**
 * Renders multiple entity nodes, adding a heading for each instance if there are multiple.
 * Used for entities with form layout and multiple instances.
 */
const renderEntityNodes = async (
  entityNodes: ArenaNode[],
  entityDef: NodeDefEntity,
  context: RenderContext,
  depth: number
): Promise<DocChild[]> => {
  const result: DocChild[] = []
  for (let index = 0; index < entityNodes.length; index++) {
    const entityNode = entityNodes[index]
    if (entityNodes.length > 1) {
      result.push(
        new Paragraph({
          text: `${label(entityDef, context.lang)} #${index + 1}`,
          heading: headingForDepth(Math.min(depth + 1, headingLevels.length - 1)),
          spacing: { before: 200, after: 80 },
        })
      )
    }
    result.push(...(await renderEntityChildren(entityDef, context, depth + 1, entityNode)))
  }
  return result
}

// ─── Main Entity Definition Renderer ────────────────────────────────────────────

/**
 * Main recursive entity renderer.
 * Renders an entity definition with heading and recurses into children.
 * Handles three cases:
 * 1. Multiple entities with table layout → renders as a table
 * 2. Multiple entities with form layout → renders one section per instance
 * 3. Single entity → renders once
 */
export const renderEntityDef = async (
  entityDef: NodeDefEntity,
  context: RenderContext,
  depth: number,
  parentEntityNode?: ArenaNode
): Promise<DocChild[]> => {
  const { record } = context
  const isRoot = NodeDefs.isRoot(entityDef)
  const isMultiple = NodeDefs.isMultiple(entityDef)
  const layoutRenderType = NodeDefs.getLayoutRenderType(context.cycle)(entityDef)
  const isTableLayout = layoutRenderType === NodeDefEntityRenderType.table

  const entityNodes: ArenaNode[] =
    record && parentEntityNode ? Records.getChildren(parentEntityNode, entityDef.uuid)(record) : []

  const result: DocChild[] = []

  if (!isRoot) {
    result.push(
      new Paragraph({
        text: label(entityDef, context.lang),
        heading: headingForDepth(depth),
        spacing: { before: 300, after: 120 },
        pageBreakBefore: isMultiple && depth <= 2,
      })
    )
  }

  if (isMultiple && isTableLayout) {
    // Multiple entity with table layout → table with data rows (or empty rows)
    result.push(renderEntityAsTable(entityDef, context, parentEntityNode))
  } else if (isMultiple) {
    // Multiple entity with form layout → one section per record instance
    if (entityNodes.length > 0) {
      result.push(...(await renderEntityNodes(entityNodes, entityDef, context, depth)))
    } else {
      // No record data: render a single blank form section
      result.push(...(await renderEntityChildren(entityDef, context, depth, parentEntityNode)))
    }
  } else {
    // Single entity
    result.push(...(await renderEntityChildren(entityDef, context, depth, entityNodes[0])))
  }

  return result
}
