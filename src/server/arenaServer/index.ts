import { ServiceRegistry } from '@openforis/arena-core'

import { DBMigrator } from '../../db'
import { Logger } from '../../log'
import { ProcessEnv } from '../../processEnv'
import { ArenaApp } from '../arenaApp'
import { InitAppOptions, initApp } from './initApp'
import { registerServices } from './registerServices'
import { start } from './start'
import { stop } from './stop'

const logger: Logger = new Logger('Arena server')

const initServices = (): ServiceRegistry => {
  return registerServices()
}

const init = async (options?: InitAppOptions): Promise<ArenaApp> => {
  initServices()
  if (!ProcessEnv.disableDbMigrations) {
    await performDatabaseMigrations(options)
  }
  return initApp(options)
}

export { ServerServiceType } from './serverServiceType'

export const ArenaServer = {
  init,
  initServices,
  start,
  stop,
}
const performDatabaseMigrations = async (options: InitAppOptions | undefined) => {
  const skipPublic = options?.skipPublicSchemaDbMigrations === true
  const skipSurvey = options?.skipSurveySchemaDbMigrations === true

  // Preserve migration-level logging/error handling for the default path.
  if (!skipPublic && !skipSurvey) {
    await DBMigrator.migrateAll()
  } else {
    try {
      logger.info(`running database migrations (skip public schema: ${skipPublic}, skip survey schemas: ${skipSurvey})`)
      if (!skipPublic) {
        await DBMigrator.migrateSchema()
      }
      if (!skipSurvey) {
        await DBMigrator.migrateSurveySchemas()
      }
      logger.info('database migrations completed')
    } catch (error) {
      logger.error(`error running database migrations: ${String(error)}`)
      throw error
    }
  }
}
