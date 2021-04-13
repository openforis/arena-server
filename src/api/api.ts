import { Express } from 'express'

import { ExpressInitializer } from '../server'
import { ChainApi } from './chain'

export const Api: ExpressInitializer = {
  init: (express: Express): void => {
    ChainApi.init(express)
  },
}
