import { Express } from 'express'

import { ExpressInitializer } from '../../server'
import { DataQueryRead } from './read'
import { DataQueryCreate } from './create'
import { DataQueryUpdate } from './update'
import { DataQueryDelete } from './delete'

export const DataQueryApi: ExpressInitializer = {
  init: (express: Express): void => {
    DataQueryCreate.init(express)
    DataQueryRead.init(express)
    DataQueryUpdate.init(express)
    DataQueryDelete.init(express)
  },
}
