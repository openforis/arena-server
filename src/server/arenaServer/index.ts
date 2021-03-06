import { DBMigrator } from '../../db'
import { ArenaApp } from '../arenaApp'
import { initApp } from './initApp'
import { registerServices } from './registerServices'
import { start } from './start'
import { stop } from './stop'

const init = async (): Promise<ArenaApp> => {
  registerServices()
  await DBMigrator.migrateAll()
  return initApp()
}

export const ArenaServer = {
  init,
  start,
  stop,
}
