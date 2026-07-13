import { ServiceRegistry, ServiceType, SurveyService } from '@openforis/arena-core'

import { ServerServiceType } from '../../server/arenaServer/serverServiceType'
import { UserGroupService } from '../../service'

export const getUserGroupService = (): UserGroupService =>
  ServiceRegistry.getInstance().getService(ServerServiceType.userGroup) as UserGroupService

export const getSurveyUuid = async (surveyId: number): Promise<string> => {
  const surveyService = ServiceRegistry.getInstance().getService(ServiceType.survey) as SurveyService
  const survey = await surveyService.get({ surveyId })
  return survey.uuid
}
