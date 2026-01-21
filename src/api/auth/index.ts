import { Express } from 'express'

import { ExpressInitializer } from '../../server'
import { AuthLogin } from './login'
import { AuthTokenRefresh } from './authTokenRefresh'
import { AuthTempToken } from './authTempToken'

export const AuthApi: ExpressInitializer = {
  init: (express: Express): void => {
    AuthLogin.init(express)
    AuthTokenRefresh.init(express)
    AuthTempToken.init(express)
  },
}
