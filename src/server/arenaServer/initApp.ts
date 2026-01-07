import express, { Express } from 'express'
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
import { ServiceRegistry } from '@openforis/arena-core'

export interface InitAppOptions {
  fileSizeLimit?: number
  bodyParseLimit?: string
}

const defaultOptions: InitAppOptions = {
  fileSizeLimit: ProcessEnv.fileUploadLimit,
  bodyParseLimit: '5000kb',
}

export const initApp = (options: InitAppOptions = defaultOptions): ArenaApp => {
  const { bodyParseLimit, fileSizeLimit } = { ...defaultOptions, ...options }
  const app: Express = express()

  if (ProcessEnv.useHttps) {
    HttpsMiddleware.init(app)
  }
  app.use(express.json({ limit: bodyParseLimit }))
  app.use(
    expressFileUpload({
      limits: { fileSize: fileSizeLimit },
      abortOnLimit: true,
      useTempFiles: true,
      tempFileDir: ProcessEnv.tempFolder,
    })
  )
  app.use(compression({ threshold: 512 }))
  HeaderMiddleware.init(app)
  const session = SessionMiddleware.init(app)
  AuthenticationMiddleware.init(app)

  Api.init(app)

  ErrorMiddleware.init(app)

  return { express: app, serviceRegistry: ServiceRegistry.getInstance(), session }
}
