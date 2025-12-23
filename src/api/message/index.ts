import { Express } from 'express'

import { ExpressInitializer } from '../../server'
import { MessageRead } from './read'
import { MessageCreate } from './create'

export const MessageApi: ExpressInitializer = {
  init: (express: Express): void => {
    MessageCreate.init(express)
    MessageRead.init(express)
  },
}
