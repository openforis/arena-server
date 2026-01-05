import path from 'path'
// @ts-ignore
import dbMigrate from 'db-migrate'

import { ProcessEnv } from '../../processEnv'
import { Schemata } from '../schemata'

enum MigrationFolder {
  public = 'public',
  survey = 'survey',
}

const configBase = {
  driver: 'pg',
  user: ProcessEnv.pgUser,
  password: ProcessEnv.pgPassword,
  host: ProcessEnv.pgHost,
  database: ProcessEnv.pgDatabase,
  ssl: ProcessEnv.pgSslAllowUnauthorized
    ? {
        rejectUnauthorized: false,
      }
    : ProcessEnv.pgSsl,
  schema: '',
}

const getConfig = (schema: string): any => {
  const config = { ...configBase, schema }
  return {
    development: config,
    production: config,
    test: config,
  }
}

const getInstance = (schema: string, cwd: string = __dirname): dbMigrate => {
  const folder = schema === Schemata.PUBLIC ? MigrationFolder.public : MigrationFolder.survey

  const options = {
    config: getConfig(schema),
    cwd: `${path.join(cwd, 'migration', folder)}`,
    env: ProcessEnv.nodeEnv,
    // Required to work around an EventEmitter leak bug.
    // See: https://github.com/db-migrate/node-db-migrate/issues/421
    throwUncatched: true,
  }
  return dbMigrate.getInstance(true, options)
}

export const DBMigrate = {
  getInstance,
}
