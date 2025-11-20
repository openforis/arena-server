const dbUrl = process.env.DATABASE_URL

const regExDbUrl = /postgres:\/\/(\w+):(\w+)@([\w.\d]+):(\d+)\/(\w+)/

const dbUrlMatch = dbUrl ? dbUrl.match(regExDbUrl) : null

const [pgUser, pgPassword, pgHost, pgPort, pgDatabase] = dbUrlMatch
  ? [dbUrlMatch[1], dbUrlMatch[2], dbUrlMatch[3], dbUrlMatch[4], dbUrlMatch[5]]
  : [process.env.PGUSER, process.env.PGPASSWORD, process.env.PGHOST, process.env.PGPORT, process.env.PGDATABASE]

export enum NodeEnv {
  development = 'development',
  production = 'production',
  test = 'test',
}

export const ProcessEnv = {
  debug: process.env.DEBUG === 'true',
  nodeEnv: process.env.NODE_ENV || NodeEnv.development,

  // Application Version
  applicationVersion: process.env.APP_VERSION ?? '2.0.0',

  // DB
  dbUrl,
  pgUser,
  pgPassword,
  pgHost,
  pgPort: Number(pgPort),
  pgDatabase,
  pgSsl: process.env.PGSSL === 'true',
  pgSslAllowUnauthorized: process.env.PGSSL_ALLOW_UNAUTHORIZED === 'true',
  disableDbMigrations: process.env.DISABLE_DB_MIGRATIONS === 'true',

  // Express
  port: Number(process.env.PORT ?? 9090),
  userAuthTokenSecret: process.env.USER_AUTH_TOKEN_SECRET || 'user-auth-token-secret',
  sessionIdCookieSecret: process.env.SESSION_ID_COOKIE_SECRET || 'session-cookie-secret',
  tempFolder: process.env.TEMP_FOLDER || '/tmp/arena_upload',
  useHttps: process.env.USE_HTTPS === 'true',

  // Logging
  disableLogging: process.env.NODE_ENV === 'test' && process.env.DISABLE_LOGS === 'true',
}
