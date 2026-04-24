import {
  AlignmentType,
  CheckBox,
  Document,
  HeadingLevel,
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
  NodeDefBoolean,
  ArenaRecord,
  I18n,
  NodeDefCoordinate,
  NodeDefProps,
} from '@openforis/arena-core'
import {
  CategoryItem,
  CategoryItems,
  LanguageCode,
  NodeDef,
  NodeDefCode,
  NodeDefEntityRenderType,
  NodeDefType,
  NodeDefs,
  NodeValueFormatter,
  NodeValues,
  Nodes,
  Objects,
  Records,
  Strings,
  Survey,
  Surveys,
  Taxa,
} from '@openforis/arena-core'

// ─── types ────────────────────────────────────────────────────────────────────

interface RenderContext {
  survey: Survey
  lang: LanguageCode
  cycle: string
  i18n: I18n
  record?: ArenaRecord
}

type DocChild = Paragraph | Table

// ─── helpers ────────────────────────────────────────────────────────────────

const EMPTY_FIELD = '________________________________'
const EMPTY_SHORT = '___________'

const label = (nodeDef: NodeDef<NodeDefType>, lang: LanguageCode): string => NodeDefs.getLabelOrName(nodeDef, lang)

const inputLine = (text: string): TextRun => new TextRun({ text, underline: {} })

/** Blank input field (underlined placeholder). */
const fieldRow = (fieldLabel: string, fieldPlaceholder = EMPTY_FIELD): Paragraph =>
  new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text: `${fieldLabel}: `, bold: true }), inputLine(fieldPlaceholder)],
  })

/** Field showing an actual data value (no underline). */
const valueRow = (fieldLabel: string, value: string): Paragraph =>
  new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text: `${fieldLabel}: `, bold: true }), new TextRun({ text: value })],
  })

/** Checkbox run – supports checked/unchecked state for data-filled rendering. */
const checkboxRun = (text: string, checked = false): [CheckBox, TextRun] => [
  new CheckBox({ checked }),
  new TextRun({ text: ` ${text}    ` }),
]

const getCategoryItemLabel = (item: CategoryItem, lang: LanguageCode): string => {
  return CategoryItems.getLabel(item, lang) ?? CategoryItems.getCode(item)
}

const getCommonLabel = (context: RenderContext, key: string, fallback: string): string => {
  const translationKey = `common.${key}`
  return context.i18n?.exists(translationKey) ? context.i18n.t(translationKey) : fallback
}

const getBooleanValueLabel = (context: RenderContext, nodeDef: NodeDefBoolean, value: boolean): string => {
  const labelType = nodeDef.props.labelValue
  if (labelType === 'trueFalse') {
    return value ? getCommonLabel(context, 'true', 'True') : getCommonLabel(context, 'false', 'False')
  }
  return value ? getCommonLabel(context, 'yes', 'Yes') : getCommonLabel(context, 'no', 'No')
}

/**
 * Formats a node's value as a display string.
 * Used for table cells and simple inline value rendering.
 */
const formatNodeValue = (nodeDef: NodeDef<NodeDefType>, context: RenderContext, node: ArenaNode): string => {
  if (Nodes.isValueBlank(node)) return ''
  const { survey, lang, cycle } = context
  switch (nodeDef.type) {
    case NodeDefType.boolean: {
      const boolDef = nodeDef as NodeDefBoolean
      return getBooleanValueLabel(context, boolDef, node.value === true || node.value === 'true')
    }
    case NodeDefType.taxon: {
      const { refData } = node
      const taxon = refData?.taxon
      if (!taxon) {
        return ''
      }
      const code = Taxa.getCode(taxon)
      const sciName = Taxa.getScientificName(taxon)
      return `${sciName} (${code})`
    }
    case NodeDefType.file:
      return NodeValues.getFileName(node) ?? ''
    case NodeDefType.code: {
      const refItem = node.refData?.categoryItem
      if (refItem) return getCategoryItemLabel(refItem, lang)
      return NodeValues.getValueCode(node.value) ?? ''
    }
    default: {
      const formatted = NodeValueFormatter.format({
        survey,
        cycle,
        nodeDef,
        node,
        value: node.value,
        lang,
        showLabel: true,
      })
      return Objects.isNil(formatted) ? '' : String(formatted)
    }
  }
}

// ─── per-type renderers ──────────────────────────────────────────────────────

const renderBoolean = (nodeDef: NodeDefBoolean, context: RenderContext, node?: ArenaNode): Paragraph => {
  const lbl = label(nodeDef, context.lang)
  const hasValue = node !== undefined && !Nodes.isValueBlank(node)
  const isTrue = hasValue && (node.value === true || node.value === 'true')
  const yesLabel = getBooleanValueLabel(context, nodeDef, true)
  const noLabel = getBooleanValueLabel(context, nodeDef, false)
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [
      new TextRun({ text: `${lbl}: `, bold: true }),
      ...checkboxRun(yesLabel, hasValue ? isTrue : false),
      ...checkboxRun(noLabel, hasValue ? !isTrue : false),
    ],
  })
}

const renderCode = (nodeDef: NodeDefCode, context: RenderContext, node?: ArenaNode): Paragraph[] => {
  const { survey } = context
  const items = survey.refData ? Surveys.getCategoryItemsByNodeDef({ survey, nodeDef }) : []

  const lbl = label(nodeDef, context.lang)
  const isCheckboxLayout =
    nodeDef.props?.layout && Object.values(nodeDef.props.layout).some((l: any) => l?.renderType === 'checkbox')
  const selectedItemUuid = node ? NodeValues.getItemUuid(node) : undefined
  const showAsCheckboxes = (isCheckboxLayout || items.length <= 8) && items.length > 0

  if (showAsCheckboxes) {
    const optionRuns = items.flatMap((item) => {
      const checked = selectedItemUuid !== undefined && item.uuid === selectedItemUuid
      return checkboxRun(getCategoryItemLabel(item, context.lang), checked)
    })
    return [
      new Paragraph({
        spacing: { before: 80, after: 80 },
        children: [new TextRun({ text: `${lbl}: `, bold: true }), ...optionRuns],
      }),
    ]
  }

  // Large list / dropdown
  if (selectedItemUuid !== undefined) {
    const selectedItem = items.find((i) => i.uuid === selectedItemUuid)
    const displayValue = selectedItem
      ? getCategoryItemLabel(selectedItem, context.lang)
      : (node?.value?.code ?? selectedItemUuid)
    return [valueRow(lbl, displayValue)]
  }
  const size = items.length
  const sizeLabel = size > 0 ? ` (${size} options)` : ''
  return [fieldRow(lbl, `[select${sizeLabel}]`)]
}

const renderDate = (nodeDef: NodeDef<NodeDefType>, context: RenderContext, node?: ArenaNode): Paragraph => {
  const lbl = label(nodeDef, context.lang)
  if (node !== undefined && !Nodes.isValueBlank(node)) return valueRow(lbl, formatNodeValue(nodeDef, context, node))
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [
      new TextRun({ text: `${lbl}: `, bold: true }),
      new TextRun({ text: 'DD', underline: {} }),
      new TextRun({ text: ' / ' }),
      new TextRun({ text: 'MM', underline: {} }),
      new TextRun({ text: ' / ' }),
      new TextRun({ text: 'YYYY', underline: {} }),
    ],
  })
}

const renderTime = (nodeDef: NodeDef<NodeDefType>, context: RenderContext, node?: ArenaNode): Paragraph => {
  const lbl = label(nodeDef, context.lang)
  if (node !== undefined && !Nodes.isValueBlank(node)) return valueRow(lbl, formatNodeValue(nodeDef, context, node))
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [
      new TextRun({ text: `${lbl}: `, bold: true }),
      new TextRun({ text: 'HH', underline: {} }),
      new TextRun({ text: ' : ' }),
      new TextRun({ text: 'MM', underline: {} }),
    ],
  })
}

const renderCoordinate = (nodeDef: NodeDefCoordinate, context: RenderContext, node?: ArenaNode): Paragraph[] => {
  const { i18n, lang } = context
  const lbl = label(nodeDef, lang)
  const hasValue = node !== undefined && !Nodes.isValueBlank(node)
  const val = hasValue ? (node.value ?? {}) : null
  const cell = (v: string) => (hasValue ? new TextRun({ text: v }) : inputLine(v))
  const valueFields = [
    NodeValues.ValuePropsCoordinate.srs,
    NodeValues.ValuePropsCoordinate.x,
    NodeValues.ValuePropsCoordinate.y,
    ...NodeDefs.getCoordinateAdditionalFields(nodeDef),
  ]
  const labelByField = valueFields.reduce(
    (acc, field) => {
      const labelKey = `surveyForm:nodeDefCoordinate.${field}`
      const fieldLabel = i18n.exists(labelKey) ? i18n.t(labelKey) : field
      acc[field] = fieldLabel
      return acc
    },
    {} as Record<string, string>
  )
  const maxLabelLength = Math.max(...valueFields.map((f) => labelByField[f].length))
  for (const field of valueFields) {
    const fieldLabel = labelByField[field]
    if (fieldLabel.length < maxLabelLength) {
      labelByField[field] = Strings.padStart(maxLabelLength, ' ')(fieldLabel)
    }
  }
  return [
    new Paragraph({ spacing: { before: 80, after: 40 }, children: [new TextRun({ text: `${lbl}:`, bold: true })] }),
    new Paragraph({
      spacing: { before: 0, after: 80 },
      indent: { left: 360 },
      children: valueFields.flatMap((valueField) => {
        const fieldLabel = labelByField[valueField]
        const fieldValue = String(val?.[valueField] ?? EMPTY_SHORT)
        return [new TextRun({ text: `${fieldLabel}: `, bold: true }), cell(fieldValue)]
      }),
    }),
  ]
}

const renderTaxon = (nodeDef: NodeDef<NodeDefType>, context: RenderContext, node?: ArenaNode): Paragraph[] => {
  const { i18n, lang } = context
  const lbl = label(nodeDef, lang)
  const hasValue = node !== undefined && !Nodes.isValueBlank(node)
  const taxonCode = hasValue ? (node.value?.code ?? '') : EMPTY_SHORT
  const sciName = hasValue ? (NodeValues.getScientificName(node) ?? '') : EMPTY_FIELD
  return [
    new Paragraph({ spacing: { before: 80, after: 40 }, children: [new TextRun({ text: `${lbl}:`, bold: true })] }),
    new Paragraph({
      spacing: { before: 0, after: 80 },
      indent: { left: 360 },
      children: [
        new TextRun({ text: `${i18n.t('surveyForm:nodeDefTaxon.code')}: `, bold: true }),
        hasValue ? new TextRun({ text: taxonCode }) : inputLine(EMPTY_SHORT),
        new TextRun({ text: `   ${i18n.t('surveyForm:nodeDefTaxon.scientificName')}: `, bold: true }),
        hasValue ? new TextRun({ text: sciName }) : inputLine(EMPTY_FIELD),
      ],
    }),
  ]
}

const renderFile = (nodeDef: NodeDef<NodeDefType>, context: RenderContext, node?: ArenaNode): Paragraph => {
  const lbl = label(nodeDef, context.lang)
  if (node !== undefined && !Nodes.isValueBlank(node)) {
    return valueRow(lbl, NodeValues.getFileName(node) ?? '[attached file]')
  }
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [
      new TextRun({ text: `${lbl}: `, bold: true }),
      new TextRun({ text: '[file attachment]', italics: true, color: '888888' }),
    ],
  })
}

const renderGeo = (nodeDef: NodeDef<NodeDefType>, context: RenderContext, node?: ArenaNode): Paragraph => {
  const lbl = label(nodeDef, context.lang)
  if (node !== undefined && !Nodes.isValueBlank(node)) {
    return valueRow(lbl, '[geometry data]')
  }
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [
      new TextRun({ text: `${lbl}: `, bold: true }),
      new TextRun({ text: '[geometry]', italics: true, color: '888888' }),
    ],
  })
}

const renderFormHeader = (nodeDef: NodeDef<NodeDefType>, context: RenderContext, depth: number): Paragraph => {
  const lbl = label(nodeDef, context.lang)
  const headingMap: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
    0: HeadingLevel.HEADING_3,
    1: HeadingLevel.HEADING_4,
    2: HeadingLevel.HEADING_5,
  }
  return new Paragraph({
    text: lbl,
    heading: headingMap[Math.min(depth, 2)] ?? HeadingLevel.HEADING_5,
    spacing: { before: 200, after: 100 },
  })
}

// ─── attribute renderer ──────────────────────────────────────────────────────

const renderAttribute = (
  nodeDef: NodeDef<NodeDefType>,
  context: RenderContext,
  depth: number,
  node?: ArenaNode
): DocChild[] => {
  switch (nodeDef.type) {
    case NodeDefType.boolean:
      return [renderBoolean(nodeDef as NodeDefBoolean, context, node)]
    case NodeDefType.code:
      return renderCode(nodeDef as NodeDefCode, context, node)
    case NodeDefType.date:
      return [renderDate(nodeDef, context, node)]
    case NodeDefType.time:
      return [renderTime(nodeDef, context, node)]
    case NodeDefType.coordinate:
      return renderCoordinate(nodeDef as NodeDefCoordinate, context, node)
    case NodeDefType.taxon:
      return renderTaxon(nodeDef, context, node)
    case NodeDefType.file:
      return [renderFile(nodeDef, context, node)]
    case NodeDefType.geo:
      return [renderGeo(nodeDef, context, node)]
    case NodeDefType.formHeader:
      return [renderFormHeader(nodeDef, context, depth)]
    case NodeDefType.integer:
    case NodeDefType.decimal: {
      const lbl = label(nodeDef, context.lang)
      if (node !== undefined && !Nodes.isValueBlank(node))
        return [valueRow(lbl, formatNodeValue(nodeDef, context, node))]
      return [fieldRow(lbl, EMPTY_SHORT)]
    }
    case NodeDefType.text:
    default: {
      const lbl = label(nodeDef, context.lang)
      if (node !== undefined && !Nodes.isValueBlank(node))
        return [valueRow(lbl, formatNodeValue(nodeDef, context, node))]
      return [fieldRow(lbl, EMPTY_FIELD)]
    }
  }
}

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
  const children = Surveys.getNodeDefChildrenSorted({ survey, nodeDef: entityDef, cycle, includeAnalysis: false })
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
    width: { size: 100, type: WidthType.PERCENTAGE },
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

/**
 * Renders the attribute and entity children of a given entity definition as a grid (with cell spanning),
 * if layoutChildren is defined. Otherwise, falls back to the default flat rendering.
 */
const renderEntityChildren = (
  entityDef: NodeDef<NodeDefType>,
  context: RenderContext,
  depth: number,
  parentEntityNode?: ArenaNode
): DocChild[] => {
  const { survey, cycle, record } = context
  // Try to get grid layout

  // layoutChildren can be (NodeDefEntityChildPosition | string)[]
  const layoutChildrenRaw = NodeDefs.getLayoutChildren?.(cycle)?.(entityDef as any) ?? []
  // Only use items that are objects with x/y/i (not strings)
  const layoutChildren = layoutChildrenRaw.filter(
    (item: any): item is { x: number; y: number; w?: number; h?: number; i: string } =>
      typeof item === 'object' &&
      item !== null &&
      typeof item.x === 'number' &&
      typeof item.y === 'number' &&
      typeof item.i === 'string'
  )
  const hasGrid = layoutChildren.length > 0

  if (hasGrid) {
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

    // Build grid: grid[y][x] = {item, nodeDef}
    const grid: Array<Array<{ item: (typeof layoutChildren)[0]; nodeDef: NodeDef<NodeDefType> | undefined } | null>> =
      Array.from({ length: maxY }, () => Array(maxX).fill(null))
    for (const item of layoutChildren) {
      const nodeDef = childDefByUuid[item.i]
      if (!nodeDef) continue
      grid[item.y][item.x] = { item, nodeDef }
    }

    // Track merged cells
    const skip: boolean[][] = Array.from({ length: maxY }, () => Array(maxX).fill(false))

    // Build TableRows
    const tableRows: TableRow[] = []
    for (let y = 0; y < maxY; y++) {
      const rowCells: TableCell[] = []
      for (let x = 0; x < maxX; x++) {
        if (skip[y][x]) continue
        const cell = grid[y][x]
        if (cell && cell.nodeDef) {
          const { item, nodeDef } = cell
          const w = item.w ?? 1
          const h = item.h ?? 1
          // Mark spanned cells to skip
          for (let dy = 0; dy < h; dy++) {
            for (let dx = 0; dx < w; dx++) {
              if (dy !== 0 || dx !== 0) skip[y + dy][x + dx] = true
            }
          }
          // Get node value if present
          let childNode: ArenaNode | undefined
          if (record && parentEntityNode) {
            childNode = Records.getChildren(parentEntityNode, nodeDef.uuid)(record)[0]
          }
          // Render attribute/entity
          const rendered = NodeDefs.isEntity(nodeDef)
            ? renderEntityDef(nodeDef, context, depth + 1, parentEntityNode)
            : renderAttribute(nodeDef, context, depth, childNode)
          rowCells.push(
            new TableCell({
              children: Array.isArray(rendered) ? rendered : [rendered],
              columnSpan: w > 1 ? w : undefined,
              rowSpan: h > 1 ? h : undefined,
            })
          )
        } else {
          // Empty cell
          rowCells.push(new TableCell({ children: [new Paragraph({ text: '' })] }))
        }
      }
      tableRows.push(new TableRow({ children: rowCells }))
    }
    return [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: tableRows,
      }),
    ]
  }

  // Fallback: default flat rendering
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
      result.push(...renderEntityDef(child, context, depth + 1, parentEntityNode))
    } else {
      let childNode: ArenaNode | undefined
      if (record && parentEntityNode) {
        childNode = Records.getChildren(parentEntityNode, child.uuid)(record)[0]
      }
      result.push(...renderAttribute(child, context, depth, childNode))
    }
  }

  return result
}

/**
 * Renders multiple entity nodes, adding a heading for each instance if there are multiple nodes.
 */
const renderEntityNodes = (
  entityNodes: ArenaNode[],
  entityDef: NodeDef<NodeDefType, NodeDefProps>,
  context: RenderContext,
  depth: number
) => {
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
    result.push(...renderEntityChildren(entityDef, context, depth + 1, entityNode))
  }
  return result
}

/**
 * Renders an entity definition – adding a heading and recursing into children.
 * When a record is present, fetches actual entity instances from the record
 * and renders one section per instance (form layout) or one row per instance
 * (table layout).
 */
const renderEntityDef = (
  entityDef: NodeDef<NodeDefType>,
  context: RenderContext,
  depth: number,
  parentEntityNode?: ArenaNode
): DocChild[] => {
  const { record } = context
  const isRoot = NodeDefs.isRoot(entityDef)
  const isMultiple = NodeDefs.isMultiple(entityDef)
  const layoutRenderType = NodeDefs.getLayoutRenderType(context.cycle)(entityDef as any)
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
      result.push(...renderEntityNodes(entityNodes, entityDef, context, depth))
    } else {
      // No record data: render a single blank form section
      result.push(...renderEntityChildren(entityDef, context, depth))
    }
  } else {
    // Single entity
    result.push(...renderEntityChildren(entityDef, context, depth, entityNodes[0]))
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
}

export interface SurveyDocxResult {
  buffer: Buffer
  surveyName: string
}

const generateSurveyDocx = async (options: SurveyDocxOptions): Promise<SurveyDocxResult> => {
  const { survey, cycle, i18n, record } = options

  const lang: LanguageCode = options.lang ?? Surveys.getDefaultLanguage(survey)
  const cycleResolved: string = cycle ?? Surveys.getDefaultCycleKey(survey) ?? Surveys.getLastCycleKey(survey)

  const context: RenderContext = { survey, lang, cycle: cycleResolved, i18n, record }

  const surveyName = Surveys.getName(survey)
  const rootDef = Surveys.getNodeDefRoot({ survey })
  const rootEntityNode = record ? Records.getRoot(record) : undefined

  const bodyChildren: DocChild[] = [
    new Paragraph({
      text: surveyName,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  ]

  bodyChildren.push(...renderEntityChildren(rootDef, context, 0, rootEntityNode))

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
