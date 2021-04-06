import { ServiceRegistry, ServiceType, SRSs } from '@openforis/arena-core'

import { DBMigrator } from '../db'
import { SurveyServiceServer } from '../service'

const registerServices = (): void => {
  ServiceRegistry.getInstance().registerService(ServiceType.survey, SurveyServiceServer)
}

const init = async (): Promise<void> => {
  registerServices()
  await SRSs.init()
  await DBMigrator.migrateAll()
}

export const ArenaServer = {
  init,
}
