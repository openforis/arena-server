import { ServiceRegistry, ServiceType } from '@openforis/arena-core'
import { DataQueryServiceServer, SurveyServiceServer, UserServiceServer } from '../../service'
import { ServerServiceType } from './serverServiceType'

export const registerServices = (): void => {
  ServiceRegistry.getInstance()
    .registerService(ServerServiceType.dataQuery, DataQueryServiceServer)
    .registerService(ServiceType.survey, SurveyServiceServer)
    .registerService(ServiceType.user, UserServiceServer)
}
