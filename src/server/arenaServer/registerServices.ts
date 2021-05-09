import { ServiceRegistry, ServiceType } from '@openforis/arena-core'
import { SurveyServiceServer, UserServiceServer } from '../../service'

export const registerServices = (): void => {
  ServiceRegistry.getInstance()
    .registerService(ServiceType.survey, SurveyServiceServer)
    .registerService(ServiceType.user, UserServiceServer)
}
