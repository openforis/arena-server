import express, { Express } from 'express'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import expressFileUpload from 'express-fileupload'
import compression from 'compression'

import { ProcessEnv } from '../../processEnv'
import { ArenaApp } from '../arenaApp'
import {
  AuthenticationMiddleware,
  ErrorMiddleware,
  HeaderMiddleware,
  HttpsMiddleware,
  SessionMiddleware,
} from '../middleware'
import { Api } from '../../api'

export const initApp = (): ArenaApp => {
  const app: Express = express()

  if (ProcessEnv.useHttps) HttpsMiddleware.init(app)
  app.use(bodyParser.json({ limit: '5000kb' }))
  app.use(cookieParser())
  app.use(
    expressFileUpload({
      // Limit upload to 1 GB
      limits: { fileSize: 1024 * 1024 * 1024 },
      abortOnLimit: true,
      useTempFiles: true,
      tempFileDir: ProcessEnv.tempFolder,
    })
  )
  app.use(compression({ threshold: 512 }))
  HeaderMiddleware.init(app)
  const session = SessionMiddleware.init(app)
  AuthenticationMiddleware.init(app)

  // authApi.init(app)
  Api.init(app)

  ErrorMiddleware.init(app)

  return { express: app, session }
}
