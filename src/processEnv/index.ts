const dbUrl = process.env.DATABASE_URL

const regExDbUrl = /postgres:\/\/(\w+):(\w+)@([\w.\d]+):(\d+)\/(\w+)/

const dbUrlMatch = dbUrl ? dbUrl.match(regExDbUrl) : null

const [pgUser, pgPassword, pgHost, pgPort, pgDatabase] = dbUrlMatch
  ? [dbUrlMatch[1], dbUrlMatch[2], dbUrlMatch[3], dbUrlMatch[4], dbUrlMatch[5]]
  : [process.env.PGUSER, process.env.PGPASSWORD, process.env.PGHOST, process.env.PGPORT, process.env.PGDATABASE]

const isTrue = (val: any): boolean => String(val).toLocaleLowerCase() === 'true' || String(val) === '1'

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
  pgSsl: isTrue(process.env.PGSSL),
  pgSslAllowUnauthorized: isTrue(process.env.PGSSL_ALLOW_UNAUTHORIZED),
  disableDbMigrations: isTrue(process.env.DISABLE_DB_MIGRATIONS),

  // Express
  port: process.env.PORT || '9090',
  sessionIdCookieSecret: process.env.SESSION_ID_COOKIE_SECRET || 'session-cookie-secret',
  tempFolder: process.env.TEMP_FOLDER || '/tmp/arena_upload',
  useHttps: isTrue(process.env.USE_HTTPS),
  fileUploadLimit: Number(process.env.FILE_UPLOAD_LIMIT) || 1024 ** 3, // 1GB

  // Logging
  disableLogging: process.env.NODE_ENV === 'test' && isTrue(process.env.DISABLE_LOGS),
}
