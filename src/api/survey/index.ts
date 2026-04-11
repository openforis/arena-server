import { Express } from 'express'

import { ExpressInitializer } from '../../server'
import { SurveyDocxExport } from './docxExport'

export const SurveyApi: ExpressInitializer = {
  init: (express: Express): void => {
    SurveyDocxExport.init(express)
  },
}
