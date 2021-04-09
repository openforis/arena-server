import express, { Express } from 'express'
import cookieParser from 'cookie-parser'
import bodyParser from 'body-parser'
import expressFileUpload from 'express-fileupload'
import compression from 'compression'
import { ServiceRegistry, ServiceType, SRSs } from '@openforis/arena-core'

import { DBMigrator } from '../db'
import { ProcessEnv } from '../processEnv'
import { SurveyServiceServer } from '../service'
import { ErrorMiddleware, HeaderMiddleware, HttpsMiddleware, SessionMiddleware } from './middleware'

const registerServices = (): void => {
  ServiceRegistry.getInstance().registerService(ServiceType.survey, SurveyServiceServer)
}

const initExpress = (): Express => {
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
  SessionMiddleware.init(app)
  //TODO: authConfig.init(app) ==> rename authConfig to AuthMiddleware
  // TODO: AccessControlMiddleware must be initialized after authConfig
  // AccessControlMiddleware.init(app)

  // TODO: ====== apis
  // authApi.init(app)
  // app.use('/api', apiRouter.router)

  ErrorMiddleware.init(app)

  return app
}

const init = async (): Promise<Express> => {
  registerServices()
  await SRSs.init()
  await DBMigrator.migrateAll()
  return initExpress()
}

export const ArenaServer = {
  init,
}
