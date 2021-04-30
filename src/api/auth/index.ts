import { Express } from 'express'

import { ExpressInitializer } from '../../server'
import { AuthLogin } from './login'

export const AuthApi: ExpressInitializer = {
  init: (express: Express): void => {
    AuthLogin.init(express)
  },
}
