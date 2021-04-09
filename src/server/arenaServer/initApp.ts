import express, { Express } from 'express'
import bodyParser from 'body-parser'
import cookieParser from 'cookie-parser'
import expressFileUpload from 'express-fileupload'
import compression from 'compression'

import { ProcessEnv } from '../../processEnv'
import { ArenaApp } from '../arenaApp'
import { ErrorMiddleware, HeaderMiddleware, HttpsMiddleware, SessionMiddleware } from '../middleware'

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
  //TODO: authConfig.init(app) ==> rename authConfig to AuthMiddleware
  // TODO: AccessControlMiddleware must be initialized after authConfig
  // AccessControlMiddleware.init(app)

  // TODO: ====== apis
  // authApi.init(app)
  // app.use('/api', apiRouter.router)

  ErrorMiddleware.init(app)

  return { app, session }
}
