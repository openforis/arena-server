import { Express } from 'express'
import expressSession from 'express-session'
import connectPgSimple from 'connect-pg-simple'

import { DB } from '../../db'
import { ProcessEnv } from '../../processEnv'
import { Middleware } from './middleware'

export const SessionMiddleware: Middleware = {
  init(app: Express): void {
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
        // @ts-ignore
        pool: DB.$pool,
        tableName: 'user_sessions',
      }),
    }

    app.use(expressSession(options))
  },
}
