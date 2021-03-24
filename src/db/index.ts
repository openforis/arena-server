import * as pgPromise from 'pg-promise'

// TODO: Add ProcessUtils
const ProcessUtils = {
  ENV: {
    debug: true,
    pgSsl: true,
    dbUrl: '',
    pgUser: '',
    pgDatabase: '',
    pgPassword: '',
    pgHost: '',
    pgPort: 0,
  },
}

// TODO: Add logging
const logger = {
  debug: console.debug,
}

const debugOptions = {
  query: (e: pgPromise.IEventContext) => {
    logger.debug(`QUERY: ${e.query}`)
    if (e.params) {
      logger.debug(`PARAMS: ${JSON.stringify(e.params)}`)
    }
  },
}

const initOptions = {
  ...(ProcessUtils.ENV.debug ? debugOptions : {}),
}

const pgp = pgPromise(initOptions)

// Timestamp will automatically be converted to UTC time-zone - No need to convert in select queries anymore
// 1114 is OID for timestamp in Postgres
pgp.pg.types.setTypeParser(1114, (str) => new Date(`${str} GMT`))

const configCommon = {
  // How long a client is allowed to remain idle before being closed
  idleTimeoutMillis: 30000,
  // Max number of clients in the pool
  max: 10,
  // Whether to use ssl connections
  ssl: ProcessUtils.ENV.pgSsl,
}

const config = ProcessUtils.ENV.dbUrl
  ? {
      connectionString: ProcessUtils.ENV.dbUrl,
      ...configCommon,
    }
  : {
      user: ProcessUtils.ENV.pgUser,
      database: ProcessUtils.ENV.pgDatabase,
      password: ProcessUtils.ENV.pgPassword,
      host: ProcessUtils.ENV.pgHost,
      port: ProcessUtils.ENV.pgPort,
      ...configCommon,
    }

export const DB = pgp(config)
