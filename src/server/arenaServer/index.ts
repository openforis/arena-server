import { SRSs } from '@openforis/arena-core'

import { DBMigrator } from '../../db'
import { ArenaApp } from '../arenaApp'
import { initApp } from './initApp'
import { registerServices } from './registerServices'
import { start } from './start'

const init = async (): Promise<ArenaApp> => {
  registerServices()
  await SRSs.init()
  await DBMigrator.migrateAll()
  return initApp()
}

export const ArenaServer = {
  init,
  start,
}
