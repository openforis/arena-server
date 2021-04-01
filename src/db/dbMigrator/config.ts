import { ProcessEnv } from '../../processEnv'

const configBase = {
  driver: 'pg',
  user: ProcessEnv.pgUser,
  password: ProcessEnv.pgPassword,
  host: ProcessEnv.pgHost,
  database: ProcessEnv.pgDatabase,
  ssl: ProcessEnv.pgSsl,
  schema: '',
}

export const getConfig = (schema: string): any => {
  const config = { ...configBase, schema }
  return {
    development: config,
    production: config,
    test: config,
  }
}
