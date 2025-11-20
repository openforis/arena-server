import { ServiceRegistry, ServiceType } from '@openforis/arena-core'
import {
  DataQueryServiceServer,
  InfoServiceServer,
  SurveyServiceServer,
  UserAuthTokenServiceServer,
  UserServiceServer,
} from '../../service'
import { ServerServiceType } from './serverServiceType'

export const registerServices = (): void => {
  ServiceRegistry.getInstance()
    .registerService(ServerServiceType.dataQuery, DataQueryServiceServer)
    .registerService(ServiceType.info, InfoServiceServer)
    .registerService(ServiceType.survey, SurveyServiceServer)
    .registerService(ServiceType.userAuthToken, UserAuthTokenServiceServer)
    .registerService(ServiceType.user, UserServiceServer)
}
