const { ProcessEnv } = require('../../../processEnv')

const config = {
  driver: 'pg',
  user: ProcessEnv.pgUser,
  password: ProcessEnv.pgPassword,
  host: ProcessEnv.pgHost,
  database: ProcessEnv.pgDatabase,
  ssl: ProcessEnv.pgSsl,
}

module.exports = {
  development: config,
  production: config,
}
