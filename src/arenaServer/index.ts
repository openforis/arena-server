import { ServiceRegistry, ServiceType } from '@openforis/arena-core'

import { DBMigrator } from '../db'
import { SurveyServiceServer } from '../survey'

const registerServices = (): void => {
  ServiceRegistry.getInstance().registerService(ServiceType.survey, SurveyServiceServer)
}

const init = async (): Promise<void> => {
  registerServices()
  await DBMigrator.migrateAll()
}

export const ArenaServer = {
  init,
}
