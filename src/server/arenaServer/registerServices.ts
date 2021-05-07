import { ServiceRegistry, ServiceType } from '@openforis/arena-core'
import { SurveyServiceServer, UserServiceServer, ActivityLogServiceServer } from '../../service'

export const registerServices = (): void => {
  ServiceRegistry.getInstance()
    .registerService(ServiceType.survey, SurveyServiceServer)
    .registerService(ServiceType.user, UserServiceServer)
    .registerService(ServiceType.activityLog, ActivityLogServiceServer)
}
