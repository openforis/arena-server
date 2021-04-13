import { Express } from 'express'

import { ExpressInitializer } from '../../server'
import { ChainRead } from './read'

export const ChainApi: ExpressInitializer = {
  init: (express: Express): void => {
    ChainRead.init(express)
  },
}
