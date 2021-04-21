import { ServiceRegistry, ServiceType } from '@openforis/arena-core'
import { SurveyServiceServer } from '../../service'
import { UserServiceServer } from '../../service/user/index'

export const registerServices = (): void => {
  ServiceRegistry.getInstance()
    .registerService(ServiceType.survey, SurveyServiceServer)
    .registerService(ServiceType.user, UserServiceServer)
}
