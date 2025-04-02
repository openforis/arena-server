import { DBMigrator } from '../../db'
import { ProcessEnv } from '../../processEnv'
import { ArenaApp } from '../arenaApp'
import { InitAppOptions, initApp } from './initApp'
import { registerServices } from './registerServices'
import { start } from './start'
import { stop } from './stop'

const init = async (options?: InitAppOptions): Promise<ArenaApp> => {
  registerServices()
  if (!ProcessEnv.disableDbMigrations) {
    await DBMigrator.migrateAll()
  }
  return initApp(options)
}

export const ArenaServer = {
  init,
  start,
  stop,
}
