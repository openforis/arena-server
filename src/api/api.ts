import { Express } from 'express'

import { ExpressInitializer } from '../server'

import { AuthApi } from './auth'
import { ChainApi } from './chain'
import { DataQueryApi } from './dataQuery'
import { InfoApi } from './info'
import { MessageApi } from './message'
import { User2FAAuthApi } from './user2FAAuth'

export const Api: ExpressInitializer = {
  init: (express: Express): void => {
    AuthApi.init(express)
    ChainApi.init(express)
    DataQueryApi.init(express)
    InfoApi.init(express)
    MessageApi.init(express)
    User2FAAuthApi.init(express)
  },
}
