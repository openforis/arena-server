import { ServiceRegistry } from '@openforis/arena-core'

import { DBMigrator } from '../../db'
import { ProcessEnv } from '../../processEnv'
import { ArenaApp } from '../arenaApp'
import { InitAppOptions, initApp } from './initApp'
import { registerServices } from './registerServices'
import { start } from './start'
import { stop } from './stop'

const initServices = (): ServiceRegistry => {
  return registerServices()
}

const init = async (options?: InitAppOptions): Promise<ArenaApp> => {
  initServices()
  if (!ProcessEnv.disableDbMigrations) {
    if (!options?.skipPublicSchemaDbMigrations) {
      await DBMigrator.migrateSchema()
    }
    if (!options?.skipSurveySchemaDbMigrations) {
      await DBMigrator.migrateSurveySchemas()
    }
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
