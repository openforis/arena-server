import { Express } from 'express'

import { ExpressInitializer } from '../server'

import { AuthApi } from './auth'
import { ChainApi } from './chain'
import { DataQueryApi } from './dataQuery'

export const Api: ExpressInitializer = {
  init: (express: Express): void => {
    AuthApi.init(express)
    ChainApi.init(express)
    DataQueryApi.init(express)
  },
}
