import {
  ArenaJobSerialized,
  LanguageCode,
  ArenaSurvey,
  ArenaSurveyService,
  ArenaSurveyProps,
  ArenaUser,
} from '@openforis/arena-core'

import { getAllIds } from './getAllIds'
import { get } from './get'

export type { SurveyDocOptions, RenderContext, SurveyDocRenderer } from './docExport'
export { walkSurvey, walkEntityDef, walkEntityChildren } from './docExport'

export type { SurveyDocxOptions } from './docxExport'
export { DocxSurveyDocRenderer, SurveyDocxGenerator } from './docxExport'

export type { SurveyPdfOptions, SurveyPdfResult, PdfElement } from './pdfExport'
export { SurveyPdfGenerator, PdfSurveyDocRenderer } from './pdfExport'

export const SurveyServiceServer: ArenaSurveyService = {
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  clone(options: {
    name: string
    label: string
    lang: LanguageCode
    surveyId: number
    user: ArenaUser
  }): Promise<ArenaJobSerialized<any>> {
    throw new Error('TODO')
  },

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  count(options: { user: ArenaUser }): Promise<number> {
    throw new Error('TODO')
  },

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  create(options: { name: string; label: string; lang: LanguageCode; user: ArenaUser }): Promise<ArenaSurvey> {
    throw new Error('TODO')
  },

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  delete(options: { surveyId: number; user: ArenaUser }): Promise<void> {
    throw new Error('TODO')
  },

  get,

  getAllIds,

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getMany(options: { limit?: number; offset?: number; user: ArenaUser }): Promise<Array<ArenaSurvey>> {
    throw new Error('TODO')
  },

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  publish(options: { surveyId: number; user: ArenaUser }): Promise<ArenaJobSerialized<any>> {
    throw new Error('TODO')
  },

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(options: { props: ArenaSurveyProps; surveyId: number; user: ArenaUser }): Promise<ArenaSurvey> {
    throw new Error('TODO')
  },
}
