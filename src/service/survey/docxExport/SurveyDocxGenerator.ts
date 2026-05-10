import {
  AlignmentType,
  Document,
  HeadingLevel,
  IBorderOptions,
  ITableBordersOptions,
  ITableWidthProperties,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'

import type {
  Node as ArenaNode,
  ArenaRecord,
  I18n,
  NodeDefEntityChildPosition,
  NodeDefEntity,
} from '@openforis/arena-core'
import {
  LanguageCode,
  NodeDef,
  NodeDefEntityRenderType,
  NodeDefType,
  NodeDefs,
  Records,
  Survey,
  Surveys,
} from '@openforis/arena-core'

import { MAX_IMAGE_HEIGHT, MAX_IMAGE_WIDTH } from './ImageUtils'
import { renderAttributeByType, type DocChild, type RenderContext, type RenderLimits } from './renderers/attribute'
import { formatNodeValue, label } from './renderers/attribute/common'

// ─── helpers ────────────────────────────────────────────────────────────────

const TABLE_MAX_AVAILABLE_WIDTH: ITableWidthProperties = { size: 100, type: WidthType.PERCENTAGE }
const BORDER_NONE: IBorderOptions = { style: 'none', size: 0, color: 'FFFFFF' }
const TABLE_BORDERS_NONE: ITableBordersOptions = {
  top: BORDER_NONE,
  bottom: BORDER_NONE,
  left: BORDER_NONE,
  right: BORDER_NONE,
  insideHorizontal: BORDER_NONE,
  insideVertical: BORDER_NONE,
}
const DOC_PAGE_WIDTH_TWIPS = 12240
const DOC_HORIZONTAL_MARGINS_TWIPS = 1080 + 1080
const TWIPS_PER_INCH = 1440
const PX_PER_INCH = 96
const DOC_CONTENT_WIDTH_PX = Math.floor(
  ((DOC_PAGE_WIDTH_TWIPS - DOC_HORIZONTAL_MARGINS_TWIPS) / TWIPS_PER_INCH) * PX_PER_INCH
)
const MIN_CELL_IMAGE_WIDTH = 80
const CELL_IMAGE_PADDING_PX = 12

const getMaxImageWidthForGridCell = (gridColumns: number, columnSpan: number): number => {
  const columns = Math.max(gridColumns, 1)
  const span = Math.max(columnSpan, 1)
  const estimatedCellWidth = Math.floor((DOC_CONTENT_WIDTH_PX / columns) * span) - CELL_IMAGE_PADDING_PX
  return Math.max(MIN_CELL_IMAGE_WIDTH, Math.min(MAX_IMAGE_WIDTH, estimatedCellWidth))
}
const renderAttribute = async (
  nodeDef: NodeDef<NodeDefType>,
  context: RenderContext,
  depth: number,
  node?: ArenaNode,
  limits?: RenderLimits
): Promise<DocChild[]> => renderAttributeByType({ nodeDef, context, depth, node, limits })

// ─── table renderer (for multiple entities with table layout) ─────────────────

const emptyTableRows = (attrDefs: NodeDef<NodeDefType>[], count = 3): TableRow[] =>
  Array.from(
    { length: count },
    () => new TableRow({ children: attrDefs.map(() => new TableCell({ children: [new Paragraph({ text: '' })] })) })
  )

const renderEntityAsTable = (
  entityDef: NodeDef<NodeDefType>,
  context: RenderContext,
  parentEntityNode?: ArenaNode
): Table => {
  const { survey, lang, cycle, record } = context
  const children = Surveys.getNodeDefChildrenSorted({
    survey,
    nodeDef: entityDef,
    cycle,
    includeAnalysis: false,
    includeLayoutElements: true,
  })
  const attrDefs = children.filter(NodeDefs.isAttribute)

  const headerCells = attrDefs.map(
    (attr) =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: label(attr, lang), bold: true })] })],
        shading: { fill: 'D9E1F2' },
      })
  )

  let dataRows: TableRow[]
  if (record && parentEntityNode) {
    const entityNodes = Records.getChildren(parentEntityNode, entityDef.uuid)(record)
    if (entityNodes.length > 0) {
      dataRows = entityNodes.map(
        (entityNode) =>
          new TableRow({
            children: attrDefs.map((attrDef) => {
              const attrNode = Records.getChildren(entityNode, attrDef.uuid)(record)[0]
              const cellText = attrNode ? formatNodeValue(attrDef, context, attrNode) : ''
              return new TableCell({ children: [new Paragraph({ text: cellText })] })
            }),
          })
      )
    } else {
      dataRows = emptyTableRows(attrDefs)
    }
  } else {
    dataRows = emptyTableRows(attrDefs)
  }

  return new Table({
    width: TABLE_MAX_AVAILABLE_WIDTH,
    rows: [new TableRow({ children: headerCells, tableHeader: true }), ...dataRows],
  })
}

// ─── entity renderer (recursive) ─────────────────────────────────────────────

const headingLevels = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
]

const headingForDepth = (depth: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] =>
  headingLevels[Math.min(depth, headingLevels.length - 1)]

// Grid cell type for layout
type GridCell = { item: NodeDefEntityChildPosition; nodeDef: NodeDef<NodeDefType> | undefined }

const buildGrid = (
  layoutChildren: NodeDefEntityChildPosition[],
  childDefByUuid: Record<string, NodeDef<NodeDefType>>,
  maxX: number,
  maxY: number
) => {
  const grid: Array<Array<GridCell | null>> = Array.from({ length: maxY }, () => new Array(maxX).fill(null))
  for (const item of layoutChildren) {
    const nodeDef = childDefByUuid[item.i]
    if (!nodeDef) continue
    grid[item.y][item.x] = { item, nodeDef }
  }
  return grid
}

const markSpannedCells = (skip: boolean[][], x: number, y: number, w: number, h: number) => {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      if (dy !== 0 || dx !== 0) {
        skip[y + dy][x + dx] = true
      }
    }
  }
}

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
  record: ArenaRecord | undefined
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
    const rowCells: TableCell[] = []
    for (let x = 0; x < maxX; x++) {
      if (skip[y][x]) continue
      rowCells.push(await renderCell(grid[y][x], x, y))
    }
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

// Default flat renderer
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

const renderEntityChildren = async (
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

/**
 * Renders multiple entity nodes, adding a heading for each instance if there are multiple nodes.
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

/**
 * Renders an entity definition – adding a heading and recursing into children.
 * When a record is present, fetches actual entity instances from the record
 * and renders one section per instance (form layout) or one row per instance
 * (table layout).
 */
const renderEntityDef = async (
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
      result.push(...(await renderEntityChildren(entityDef, context, depth)))
    }
  } else {
    // Single entity
    result.push(...(await renderEntityChildren(entityDef, context, depth, entityNodes[0])))
  }

  return result
}

// ─── public API ──────────────────────────────────────────────────────────────

export interface SurveyDocxOptions {
  survey: Survey
  cycle?: string
  lang?: LanguageCode
  i18n: I18n
  /** When provided, the document is filled with the record's data instead of blank input fields. */
  record?: ArenaRecord
  /** Async function to retrieve file data by UUID for rendering images. Returns Buffer. */
  fileProvider?: (fileUuid: string) => Promise<Buffer>
}

export interface SurveyDocxResult {
  buffer: Buffer
  surveyName: string
}

const generateSurveyDocx = async (options: SurveyDocxOptions): Promise<SurveyDocxResult> => {
  const { survey, cycle, i18n, record, fileProvider } = options

  const lang: LanguageCode = options.lang ?? Surveys.getDefaultLanguage(survey)
  const cycleResolved: string = cycle ?? Surveys.getDefaultCycleKey(survey) ?? Surveys.getLastCycleKey(survey)

  const context: RenderContext = { survey, lang, cycle: cycleResolved, i18n, record, fileProvider }

  const surveyName = Surveys.getName(survey)
  const surveyLabel = Surveys.getLabel(lang)(survey)
  const surveyDescription = Surveys.getDescription(lang)(survey)

  const rootDef = Surveys.getNodeDefRoot({ survey })
  const rootEntityNode = record ? Records.getRoot(record) : undefined

  const bodyChildren: DocChild[] = []
  // Title
  bodyChildren.push(
    new Paragraph({
      text: surveyLabel ?? surveyName,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: surveyDescription ? 100 : 400 },
    })
  )
  // Subtitle (description)
  if (surveyDescription) {
    bodyChildren.push(
      new Paragraph({
        text: surveyDescription,
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      })
    )
  }

  bodyChildren.push(...(await renderEntityChildren(rootDef, context, 0, rootEntityNode)))

  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: 'Normal',
          name: 'Normal',
          run: { font: 'Calibri', size: 22 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 1080, right: 1080 },
          },
        },
        children: bodyChildren,
      },
    ],
  })

  return {
    buffer: await Packer.toBuffer(doc),
    surveyName,
  }
}

export const SurveyDocxGenerator = {
  generateSurveyDocx,
}
