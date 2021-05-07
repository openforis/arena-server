import { Express } from 'express'

import { ExpressInitializer } from '../../server'
import { SurveyCreate } from './create'

export const SurveyApi: ExpressInitializer = {
  init: (express: Express): void => {
    SurveyCreate.init(express)
  },
}
