import { AlignmentType, Document, HeadingLevel, Packer, Paragraph } from 'docx'

import type { ArenaRecord, I18n } from '@openforis/arena-core'
import { LanguageCode, Records, Survey, Surveys } from '@openforis/arena-core'

import type { DocChild, RenderContext } from './renderers/attribute'
import { renderEntityChildren } from './renderers/entity'
import { convertDocxToReadOnly } from './docxReadOnlyConverter'

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
  readOnly?: boolean
}

export interface SurveyDocxResult {
  buffer: Buffer
  surveyName: string
}

const generateSurveyDocx = async (options: SurveyDocxOptions): Promise<SurveyDocxResult> => {
  const { survey, cycle, i18n, record, fileProvider, readOnly } = options

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

  let buffer = await Packer.toBuffer(doc)

  if (readOnly) {
    buffer = await convertDocxToReadOnly(buffer)
  }

  return { buffer, surveyName }
}

export const SurveyDocxGenerator = {
  generateSurveyDocx,
}
