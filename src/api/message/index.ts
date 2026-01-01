import { Express } from 'express'

import { ExpressInitializer } from '../../server'
import { MessageCreate } from './create'
import { MessageRead } from './read'
import { MessageUpdate } from './update'
import { MessageDelete } from './delete'

export const MessageApi: ExpressInitializer = {
  init: (express: Express): void => {
    MessageCreate.init(express)
    MessageRead.init(express)
    MessageUpdate.init(express)
    MessageDelete.init(express)
  },
}
