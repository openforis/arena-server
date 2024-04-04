import { ServiceRegistry, ServiceType } from '@openforis/arena-core'
import { DataQueryService, SurveyServiceServer, UserServiceServer } from '../../service'
import { ServerServiceType } from './serverServiceType'

export const registerServices = (): void => {
  ServiceRegistry.getInstance()
    .registerService(ServerServiceType.dataQuery, DataQueryService)
    .registerService(ServiceType.survey, SurveyServiceServer)
    .registerService(ServiceType.user, UserServiceServer)
}
