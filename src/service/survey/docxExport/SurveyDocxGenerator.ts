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

import type { Node as ArenaNode, ArenaRecord, I18n, NodeDefCoordinate } from '@openforis/arena-core'
import {
  CategoryItem,
  LanguageCode,
  NodeDef,
  NodeDefCode,
  NodeDefEntityRenderType,
  NodeDefType,
  NodeDefs,
  NodeValueFormatter,
  NodeValues,
  Nodes,
  Records,
  Strings,
  Survey,
  Surveys,
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
  const labels = item.props?.labels
  if (labels) {
    const langLabel = labels[lang]
    if (langLabel) return langLabel
    const firstLabel = Object.values(labels).find(Boolean)
    if (firstLabel) return firstLabel
  }
  return item.props?.code ?? ''
}

const getCommonLabel = (context: RenderContext, key: 'yes' | 'no', fallback: string): string => {
  const translationKey = `common.${key}`
  return context.i18n?.exists(translationKey) ? context.i18n.t(translationKey) : fallback
}

/**
 * Formats a node's value as a display string.
 * Used for table cells and simple inline value rendering.
 */
const formatNodeValue = (nodeDef: NodeDef<NodeDefType>, context: RenderContext, node: ArenaNode): string => {
  if (Nodes.isValueBlank(node)) return ''
  const { survey, lang, cycle } = context
  switch (nodeDef.type) {
    case NodeDefType.boolean:
      return node.value === true || node.value === 'true' ? 'Yes' : 'No'
    case NodeDefType.date: {
      const d = NodeValues.getDateDay(node)
      const m = NodeValues.getDateMonth(node)
      const y = NodeValues.getDateYear(node)
      return `${Strings.padStart(2, '0')(String(d))}/${Strings.padStart(2, '0')(String(m))}/${Strings.padStart(4, '0')(String(y))}`
    }
    case NodeDefType.time: {
      const h = NodeValues.getTimeHour(node)
      const min = NodeValues.getTimeMinute(node)
      return `${Strings.padStart(2, '0')(String(h))}:${Strings.padStart(2, '0')(String(min))}`
    }
    case NodeDefType.coordinate: {
      const val = node.value ?? {}
      return [val.srs, `X:${val.x ?? ''}`, `Y:${val.y ?? ''}`].filter(Boolean).join('  ')
    }
    case NodeDefType.taxon: {
      const code = node.value?.code ?? ''
      const sciName = NodeValues.getScientificName(node) ?? ''
      return [code, sciName].filter(Boolean).join(' – ')
    }
    case NodeDefType.file:
      return NodeValues.getFileName(node) ?? ''
    case NodeDefType.code: {
      const refItem = node.refData?.categoryItem
      if (refItem) return getCategoryItemLabel(refItem, lang)
      return node.value?.code ?? ''
    }
    default: {
      const formatted = NodeValueFormatter.format({ survey, cycle, nodeDef, node, value: node.value, lang })
      return formatted != null ? String(formatted) : ''
    }
  }
}

// ─── per-type renderers ──────────────────────────────────────────────────────

const renderBoolean = (nodeDef: NodeDef<NodeDefType>, context: RenderContext, node?: ArenaNode): Paragraph => {
  const lbl = label(nodeDef, context.lang)
  const hasValue = node !== undefined && !Nodes.isValueBlank(node)
  const isTrue = hasValue && (node.value === true || node.value === 'true')
  const yesLabel = getCommonLabel(context, 'yes', 'Yes')
  const noLabel = getCommonLabel(context, 'no', 'No')
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [
      new TextRun({ text: `${lbl}: `, bold: true }),
      ...checkboxRun(yesLabel, hasValue ? isTrue : false),
      ...checkboxRun(noLabel, hasValue ? !isTrue : false),
    ],
  })
}

const renderCode = (
  nodeDef: NodeDef<NodeDefType>,
  context: RenderContext,
  items: CategoryItem[],
  node?: ArenaNode
): Paragraph[] => {
  const lbl = label(nodeDef, context.lang)
  const codeNodeDef = nodeDef as NodeDefCode
  const isCheckboxLayout =
    codeNodeDef.props?.layout && Object.values(codeNodeDef.props.layout).some((l: any) => l?.renderType === 'checkbox')
  const selectedItemUuid = node !== undefined ? NodeValues.getItemUuid(node) : undefined
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

  return [fieldRow(lbl, `[select${items.length > 0 ? ` (${items.length} options)` : ''}]`)]
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
  if (node !== undefined && !Nodes.isValueBlank(node)) return valueRow(lbl, '[geometry data]')
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
      return [renderBoolean(nodeDef, context, node)]

    case NodeDefType.code: {
      const codeNodeDef = nodeDef as NodeDefCode
      const items = context.survey.refData
        ? Surveys.getCategoryItemsByNodeDef({ survey: context.survey, nodeDef: codeNodeDef })
        : []
      return renderCode(nodeDef, context, items, node)
    }

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
  if (record !== undefined && parentEntityNode !== undefined) {
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
 * Renders the attribute and entity children of a given entity definition,
 * optionally bound to a specific entity node from the record.
 */
const renderEntityChildren = (
  entityDef: NodeDef<NodeDefType>,
  context: RenderContext,
  depth: number,
  parentEntityNode?: ArenaNode
): DocChild[] => {
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
      result.push(...renderEntityDef(child, context, depth + 1, parentEntityNode))
    } else {
      let childNode: ArenaNode | undefined
      if (record !== undefined && parentEntityNode !== undefined) {
        childNode = Records.getChildren(parentEntityNode, child.uuid)(record)[0]
      }
      result.push(...renderAttribute(child, context, depth, childNode))
    }
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
    record !== undefined && parentEntityNode !== undefined
      ? Records.getChildren(parentEntityNode, entityDef.uuid)(record)
      : []

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
      entityNodes.forEach((entityNode, index) => {
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
      })
    } else {
      // No record data: render a single blank form section
      result.push(...renderEntityChildren(entityDef, context, depth, undefined))
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

const toFileNameSafeSurveyName = (surveyName: string, surveyId: number): string => {
  const normalized = surveyName
    .trim()
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '')

  return normalized || `survey_${surveyId}`
}

const generateSurveyDocx = async (options: SurveyDocxOptions): Promise<SurveyDocxResult> => {
  const { survey, cycle, i18n, record } = options

  const lang: LanguageCode = options.lang ?? Surveys.getDefaultLanguage(survey)
  const cycleResolved: string = cycle ?? Surveys.getDefaultCycleKey(survey) ?? Surveys.getLastCycleKey(survey)

  const context: RenderContext = { survey, lang, cycle: cycleResolved, i18n, record }

  const surveyLabelOrName = Surveys.getLabelOrName(lang)(survey)
  const surveyName = toFileNameSafeSurveyName(surveyLabelOrName, survey.id ?? 0)
  const rootDef = Surveys.getNodeDefRoot({ survey })
  const rootEntityNode = record !== undefined ? Records.getRoot(record) : undefined

  const bodyChildren: DocChild[] = [
    new Paragraph({
      text: surveyLabelOrName,
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
