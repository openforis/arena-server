import { Express } from 'express'

import { ExpressInitializer } from '../server'
import { ChainApi } from './chain'
import { AuthApi } from './auth'
import { SurveyApi } from './survey'

export const Api: ExpressInitializer = {
  init: (express: Express): void => {
    ChainApi.init(express)
    AuthApi.init(express)
    SurveyApi.init(express)
  },
}
