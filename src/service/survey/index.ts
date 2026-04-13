import { JobSummary, LanguageCode, Survey, SurveyService, SurveyProps, User } from '@openforis/arena-core'

import type { SurveyDocxResult } from './docxExport'
import { generateDocx } from './generateDocx'
import type { GenerateSurveyDocxOptions } from './generateDocx'
import { getAllIds } from './getAllIds'
import { get } from './get'

export interface SurveyServiceWithDocx extends SurveyService {
  generateDocx(options: GenerateSurveyDocxOptions): Promise<SurveyDocxResult>
}

export const SurveyServiceServer: SurveyServiceWithDocx = {
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  clone(options: {
    name: string
    label: string
    lang: LanguageCode
    surveyId: number
    user: User
  }): Promise<JobSummary<any>> {
    throw new Error('TODO')
  },

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  count(options: { user: User }): Promise<number> {
    throw new Error('TODO')
  },

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  create(options: { name: string; label: string; lang: LanguageCode; user: User }): Promise<Survey> {
    throw new Error('TODO')
  },

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  delete(options: { surveyId: number; user: User }): Promise<void> {
    throw new Error('TODO')
  },

  generateDocx,

  get,

  getAllIds,

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getMany(options: { limit?: number; offset?: number; user: User }): Promise<Array<Survey>> {
    throw new Error('TODO')
  },

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  publish(options: { surveyId: number; user: User }): Promise<JobSummary<any>> {
    throw new Error('TODO')
  },

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(options: { props: SurveyProps; surveyId: number; user: User }): Promise<Survey> {
    throw new Error('TODO')
  },
}
