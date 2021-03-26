import * as pgPromise from 'pg-promise'
import { ProcessEnv } from 'src/processEnv'

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
  ...(ProcessEnv.debug ? debugOptions : {}),
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
  ssl: ProcessEnv.pgSsl,
}

const config = ProcessEnv.dbUrl
  ? {
      connectionString: ProcessEnv.dbUrl,
      ...configCommon,
    }
  : {
      user: ProcessEnv.pgUser,
      database: ProcessEnv.pgDatabase,
      password: ProcessEnv.pgPassword,
      host: ProcessEnv.pgHost,
      port: ProcessEnv.pgPort,
      ...configCommon,
    }

export const DB = pgp(config)
