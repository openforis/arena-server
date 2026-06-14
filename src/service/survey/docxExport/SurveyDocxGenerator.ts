import { Document, Packer } from 'docx'

import type { SurveyDocOptions } from '../docExport/types'
import { walkSurvey } from '../docExport/SurveyDocWalker'
import { DocxSurveyDocRenderer } from './DocxSurveyDocRenderer'
import { convertDocxToReadOnly } from './docxReadOnlyConverter'

// ─── public API ───────────────────────────────────────────────────────────────

export interface SurveyDocxOptions extends SurveyDocOptions {
  readOnly?: boolean
}

export interface SurveyDocxResult {
  buffer: Buffer
  surveyName: string
}

const generateSurveyDocx = async (options: SurveyDocxOptions): Promise<SurveyDocxResult> => {
  const { readOnly } = options
  const renderer = new DocxSurveyDocRenderer()
  const { elements, surveyName } = await walkSurvey(options, renderer)

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
        children: elements,
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
