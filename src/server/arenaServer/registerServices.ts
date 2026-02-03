import { ServiceRegistry, ServiceType } from '@openforis/arena-core'
import {
  DataQueryServiceServer,
  InfoServiceServer,
  MessageServiceServer,
  RecordServiceServer,
  SurveyServiceServer,
  UserAuthTokenServiceServer,
  UserTempAuthTokenServiceServer,
  UserServiceServer,
  UserTwoFactorService,
} from '../../service'
import { ServerServiceType } from './serverServiceType'

export const registerServices = (): ServiceRegistry =>
  ServiceRegistry.getInstance()
    .registerService(ServiceType.info, InfoServiceServer)
    .registerService(ServiceType.record, RecordServiceServer)
    .registerService(ServiceType.survey, SurveyServiceServer)
    .registerService(ServiceType.userAuthToken, UserAuthTokenServiceServer)
    .registerService(ServiceType.user, UserServiceServer)
    .registerService(ServerServiceType.dataQuery, DataQueryServiceServer)
    .registerService(ServerServiceType.message, MessageServiceServer)
    .registerService(ServerServiceType.userTempAuthToken, UserTempAuthTokenServiceServer)
    .registerService(ServerServiceType.userTwoFactor, UserTwoFactorService)
