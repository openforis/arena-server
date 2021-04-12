import { ServiceRegistry, ServiceType } from '@openforis/arena-core'
import { SurveyServiceServer } from '../../service'

export const registerServices = (): void => {
  ServiceRegistry.getInstance().registerService(ServiceType.survey, SurveyServiceServer)
}
