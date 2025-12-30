import { ServiceRegistry, ServiceType } from '@openforis/arena-core'
import {
  DataQueryServiceServer,
  InfoServiceServer,
  MessageServiceServer,
  SurveyServiceServer,
  UserServiceServer,
} from '../../service'
import { ServerServiceType } from './serverServiceType'

export const registerServices = (): ServiceRegistry =>
  ServiceRegistry.getInstance()
    .registerService(ServerServiceType.dataQuery, DataQueryServiceServer)
    .registerService(ServerServiceType.message, MessageServiceServer)
    .registerService(ServiceType.info, InfoServiceServer)
    .registerService(ServiceType.survey, SurveyServiceServer)
    .registerService(ServiceType.user, UserServiceServer)
