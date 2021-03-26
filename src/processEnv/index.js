const dbUrl = process.env.DATABASE_URL
const regExDbUrl = /postgres:\/\/(\w+):(\w+)@([\w-.\d]+):(\d+)\/(\w+)/
const dbUrlMatch = dbUrl ? dbUrl.match(regExDbUrl) : null
const [pgUser, pgPassword, pgHost, pgPort, pgDatabase] = dbUrlMatch
  ? [dbUrlMatch[1], dbUrlMatch[2], dbUrlMatch[3], dbUrlMatch[4], dbUrlMatch[5]]
  : [process.env.PGUSER, process.env.PGPASSWORD, process.env.PGHOST, process.env.PGPORT, process.env.PGDATABASE]

export const ProcessEnv = {
  debug: Boolean(process.env.DEBUG),
  nodeEnv: process.env.NODE_ENV || 'development',

  // DB
  dbUrl,
  pgUser,
  pgPassword,
  pgHost,
  pgPort: Number(pgPort),
  pgDatabase,
  pgSsl: Boolean(process.env.PGSSL),
}
