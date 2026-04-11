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

import {
  CategoryItem,
  LanguageCode,
  NodeDef,
  NodeDefCode,
  NodeDefEntityRenderType,
  NodeDefType,
  NodeDefs,
  Survey,
  Surveys,
} from '@openforis/arena-core'

// ─── helpers ────────────────────────────────────────────────────────────────

const EMPTY_FIELD = '________________________________'
const EMPTY_SHORT = '___________'

type DocChild = Paragraph | Table

const label = (nodeDef: NodeDef<NodeDefType>, lang: LanguageCode): string => NodeDefs.getLabelOrName(nodeDef, lang)

const inputLine = (text: string): TextRun => new TextRun({ text, underline: {} })

const fieldRow = (fieldLabel: string, fieldPlaceholder = EMPTY_FIELD): Paragraph =>
  new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text: `${fieldLabel}: `, bold: true }), inputLine(fieldPlaceholder)],
  })

const checkboxRun = (text: string): [CheckBox, TextRun] => [
  new CheckBox({ checked: false }),
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

// ─── per-type renderers ──────────────────────────────────────────────────────

const renderBoolean = (nodeDef: NodeDef<NodeDefType>, lang: LanguageCode): Paragraph =>
  new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [
      new TextRun({ text: `${label(nodeDef, lang)}: `, bold: true }),
      ...checkboxRun('Yes'),
      ...checkboxRun('No'),
    ],
  })

const renderCode = (nodeDef: NodeDef<NodeDefType>, lang: LanguageCode, items: CategoryItem[]): Paragraph[] => {
  const lbl = label(nodeDef, lang)
  const codeNodeDef = nodeDef as NodeDefCode
  const isCheckboxLayout =
    codeNodeDef.props?.layout && Object.values(codeNodeDef.props.layout).some((l: any) => l?.renderType === 'checkbox')

  if (isCheckboxLayout && items.length > 0) {
    const optionRuns = items.flatMap((item) => {
      const itemLabel = getCategoryItemLabel(item, lang)
      return checkboxRun(itemLabel)
    })
    return [
      new Paragraph({
        spacing: { before: 80, after: 80 },
        children: [new TextRun({ text: `${lbl}: `, bold: true }), ...optionRuns],
      }),
    ]
  }

  if (items.length > 0 && items.length <= 8) {
    // Small list → inline checkboxes
    const optionRuns = items.flatMap((item) => {
      const itemLabel = getCategoryItemLabel(item, lang)
      return checkboxRun(itemLabel)
    })
    return [
      new Paragraph({
        spacing: { before: 80, after: 80 },
        children: [new TextRun({ text: `${lbl}: `, bold: true }), ...optionRuns],
      }),
    ]
  }

  // Dropdown placeholder or large list
  return [fieldRow(lbl, `[select${items.length > 0 ? ` (${items.length} options)` : ''}]`)]
}

const renderDate = (nodeDef: NodeDef<NodeDefType>, lang: LanguageCode): Paragraph =>
  new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [
      new TextRun({ text: `${label(nodeDef, lang)}: `, bold: true }),
      new TextRun({ text: 'DD', underline: {} }),
      new TextRun({ text: ' / ' }),
      new TextRun({ text: 'MM', underline: {} }),
      new TextRun({ text: ' / ' }),
      new TextRun({ text: 'YYYY', underline: {} }),
    ],
  })

const renderTime = (nodeDef: NodeDef<NodeDefType>, lang: LanguageCode): Paragraph =>
  new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [
      new TextRun({ text: `${label(nodeDef, lang)}: `, bold: true }),
      new TextRun({ text: 'HH', underline: {} }),
      new TextRun({ text: ' : ' }),
      new TextRun({ text: 'MM', underline: {} }),
    ],
  })

const renderCoordinate = (nodeDef: NodeDef<NodeDefType>, lang: LanguageCode): Paragraph[] => {
  const lbl = label(nodeDef, lang)
  return [
    new Paragraph({ spacing: { before: 80, after: 40 }, children: [new TextRun({ text: `${lbl}:`, bold: true })] }),
    new Paragraph({
      spacing: { before: 0, after: 80 },
      indent: { left: 360 },
      children: [
        new TextRun({ text: 'SRS: ', bold: true }),
        inputLine(EMPTY_SHORT),
        new TextRun({ text: '   X: ', bold: true }),
        inputLine(EMPTY_SHORT),
        new TextRun({ text: '   Y: ', bold: true }),
        inputLine(EMPTY_SHORT),
      ],
    }),
  ]
}

const renderTaxon = (nodeDef: NodeDef<NodeDefType>, lang: LanguageCode): Paragraph[] => {
  const lbl = label(nodeDef, lang)
  return [
    new Paragraph({ spacing: { before: 80, after: 40 }, children: [new TextRun({ text: `${lbl}:`, bold: true })] }),
    new Paragraph({
      spacing: { before: 0, after: 80 },
      indent: { left: 360 },
      children: [
        new TextRun({ text: 'Code: ', bold: true }),
        inputLine(EMPTY_SHORT),
        new TextRun({ text: '   Scientific name: ', bold: true }),
        inputLine(EMPTY_FIELD),
      ],
    }),
  ]
}

const renderFile = (nodeDef: NodeDef<NodeDefType>, lang: LanguageCode): Paragraph =>
  new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [
      new TextRun({ text: `${label(nodeDef, lang)}: `, bold: true }),
      new TextRun({ text: '[file attachment]', italics: true, color: '888888' }),
    ],
  })

const renderGeo = (nodeDef: NodeDef<NodeDefType>, lang: LanguageCode): Paragraph =>
  new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [
      new TextRun({ text: `${label(nodeDef, lang)}: `, bold: true }),
      new TextRun({ text: '[geometry]', italics: true, color: '888888' }),
    ],
  })

const renderFormHeader = (nodeDef: NodeDef<NodeDefType>, lang: LanguageCode, depth: number): Paragraph => {
  const lbl = label(nodeDef, lang)
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
  lang: LanguageCode,
  survey: Survey,
  depth: number
): DocChild[] => {
  switch (nodeDef.type) {
    case NodeDefType.boolean:
      return [renderBoolean(nodeDef, lang)]

    case NodeDefType.code: {
      const codeNodeDef = nodeDef as NodeDefCode
      const items = survey.refData ? Surveys.getCategoryItemsByNodeDef({ survey, nodeDef: codeNodeDef }) : []
      return renderCode(nodeDef, lang, items)
    }

    case NodeDefType.date:
      return [renderDate(nodeDef, lang)]

    case NodeDefType.time:
      return [renderTime(nodeDef, lang)]

    case NodeDefType.coordinate:
      return renderCoordinate(nodeDef, lang)

    case NodeDefType.taxon:
      return renderTaxon(nodeDef, lang)

    case NodeDefType.file:
      return [renderFile(nodeDef, lang)]

    case NodeDefType.geo:
      return [renderGeo(nodeDef, lang)]

    case NodeDefType.formHeader:
      return [renderFormHeader(nodeDef, lang, depth)]

    case NodeDefType.integer:
    case NodeDefType.decimal:
      return [fieldRow(label(nodeDef, lang), EMPTY_SHORT)]

    case NodeDefType.text:
    default:
      return [fieldRow(label(nodeDef, lang), EMPTY_FIELD)]
  }
}

// ─── table renderer (for multiple entities with table layout) ─────────────────

const renderEntityAsTable = (
  survey: Survey,
  entityDef: NodeDef<NodeDefType>,
  lang: LanguageCode,
  cycle: string
): Table => {
  const children = Surveys.getNodeDefChildrenSorted({ survey, nodeDef: entityDef, cycle, includeAnalysis: false })
  const attrDefs = children.filter(NodeDefs.isAttribute)

  const headerCells = attrDefs.map(
    (attr) =>
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: label(attr, lang), bold: true })] })],
        shading: { fill: 'D9E1F2' },
      })
  )

  // 3 empty data rows
  const emptyRows = Array.from(
    { length: 3 },
    () =>
      new TableRow({
        children: attrDefs.map(() => new TableCell({ children: [new Paragraph({ text: '' })] })),
      })
  )

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: headerCells, tableHeader: true }), ...emptyRows],
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

const renderEntityChildren = (
  survey: Survey,
  entityDef: NodeDef<NodeDefType>,
  lang: LanguageCode,
  cycle: string,
  depth: number
): DocChild[] => {
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
      result.push(...renderEntityDef(survey, child, lang, cycle, depth + 1))
    } else {
      result.push(...renderAttribute(child, lang, survey, depth))
    }
  }

  return result
}

const renderEntityDef = (
  survey: Survey,
  entityDef: NodeDef<NodeDefType>,
  lang: LanguageCode,
  cycle: string,
  depth: number
): DocChild[] => {
  const isRoot = NodeDefs.isRoot(entityDef)
  const isMultiple = NodeDefs.isMultiple(entityDef)
  const layoutRenderType = NodeDefs.getLayoutRenderType(cycle)(entityDef as any)
  const isTableLayout = layoutRenderType === NodeDefEntityRenderType.table

  const result: DocChild[] = []

  // Add heading for non-root entities
  if (!isRoot) {
    result.push(
      new Paragraph({
        text: label(entityDef, lang),
        heading: headingForDepth(depth),
        spacing: { before: 300, after: 120 },
        pageBreakBefore: isMultiple && depth <= 2,
      })
    )
  }

  if (isMultiple && isTableLayout) {
    // Multiple entity with table layout → render an empty table
    result.push(renderEntityAsTable(survey, entityDef, lang, cycle))
  } else {
    // Single entity or multiple with form layout → render children recursively
    result.push(...renderEntityChildren(survey, entityDef, lang, cycle, depth))
  }

  return result
}

// ─── public API ──────────────────────────────────────────────────────────────

export interface SurveyDocxOptions {
  survey: Survey
  lang?: LanguageCode
  cycle?: string
}

export const generateSurveyDocx = async (options: SurveyDocxOptions): Promise<Buffer> => {
  const { survey } = options
  const lang: LanguageCode = options.lang ?? Surveys.getDefaultLanguage(survey)
  const cycle: string = options.cycle ?? Surveys.getDefaultCycleKey(survey) ?? Surveys.getLastCycleKey(survey)

  const surveyTitle = Surveys.getLabelOrName(lang)(survey)
  const rootDef = Surveys.getNodeDefRoot({ survey })

  const bodyChildren: DocChild[] = [
    new Paragraph({
      text: surveyTitle,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  ]

  bodyChildren.push(...renderEntityChildren(survey, rootDef, lang, cycle, 0))

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

  return Packer.toBuffer(doc)
}
