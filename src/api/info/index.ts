import { Express } from 'express'

import { ExpressInitializer } from '../../server'
import { InfoRead } from './read'

export const InfoApi: ExpressInitializer = {
  init: (express: Express): void => {
    InfoRead.init(express)
  },
}
