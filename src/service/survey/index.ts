import { JobSummary, LanguageCode, Survey, SurveyService, SurveyProps, User } from '@openforis/arena-core'

import { getAllIds } from './getAllIds'
import { get } from './get'
import { getManyByName } from './getManyByName'
import { create } from './create'

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

  create,

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  delete(options: { surveyId: number; user: User }): Promise<void> {
    throw new Error('TODO')
  },

  get,

  getAllIds,

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getMany(options: { limit?: number; offset?: number; user: User }): Promise<Array<Survey>> {
    throw new Error('TODO')
  },

  getManyByName,

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
