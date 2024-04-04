import { Express } from 'express'

import { ExpressInitializer } from '../../server'
import { DataQueryRead } from './read'

export const DataQueryApi: ExpressInitializer = {
  init: (express: Express): void => {
    DataQueryRead.init(express)
  },
}
