import { JobSummary, LanguageCode, Survey, SurveyService, User } from '@openforis/arena-core'
import { SurveyProps } from '@openforis/arena-core/dist/survey/survey'

import { getAllIds } from './getAllIds'

export const SurveyServiceServer: SurveyService = {
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

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  get(options: {
    draft?: boolean
    nodeDefOptions?: { advanced?: boolean; cycle?: string; deleted?: boolean; draft?: boolean; include: boolean }
    surveyId: number
    user: User
    validate?: boolean
  }): Promise<Survey> {
    throw new Error('TODO')
  },

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
