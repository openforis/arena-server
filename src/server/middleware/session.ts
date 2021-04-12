import { Express, RequestHandler } from 'express'
import expressSession from 'express-session'
import connectPgSimple from 'connect-pg-simple'

import { DB } from '../../db'
import { ProcessEnv } from '../../processEnv'
import { ExpressInitializer } from '../expressInitializer'

export const SessionMiddleware: ExpressInitializer<RequestHandler> = {
  init(express: Express): RequestHandler {
    const PgSession = connectPgSimple(expressSession)

    const options = {
      secret: ProcessEnv.sessionIdCookieSecret as string,
      resave: false,
      saveUninitialized: true,
      cookie: {
        // 30 days
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: false,
      },
      store: new PgSession({
        pgPromise: DB,
        tableName: 'user_sessions',
      }),
    }

    const session = expressSession(options)
    express.use(session)

    return session
  },
}
