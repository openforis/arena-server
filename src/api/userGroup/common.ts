import { ServiceRegistry, ServiceType, SurveyService } from '@openforis/arena-core'

import { ServerError, ServerErrorCode } from '../../server'
import { ServerServiceType } from '../../server/arenaServer/serverServiceType'
import { UserGroup } from '../../repository/userGroup'
import { UserGroupService } from '../../service'

export const getUserGroupService = (): UserGroupService =>
  ServiceRegistry.getInstance().getService(ServerServiceType.userGroup) as UserGroupService

export const getSurveyUuid = async (surveyId: number): Promise<string> => {
  const surveyService = ServiceRegistry.getInstance().getService(ServiceType.survey) as SurveyService
  const survey = await surveyService.get({ surveyId })
  return survey.uuid
}

/**
 * Loads the user group by uuid and ensures it belongs to the survey identified by surveyId.
 * This prevents a survey admin from acting on a user group belonging to a different survey
 * just by guessing/knowing its uuid.
 */
export const getUserGroupBelongingToSurvey = async (params: {
  surveyId: number
  groupUuid: string
}): Promise<{ surveyUuid: string; userGroup: UserGroup }> => {
  const { surveyId, groupUuid } = params

  const surveyUuid = await getSurveyUuid(surveyId)

  const service = getUserGroupService()
  const userGroup = await service.getByUuid({ uuid: groupUuid })

  if (userGroup?.surveyUuid !== surveyUuid) {
    throw new ServerError('appErrors.userGroup.notFound', { groupUuid }, ServerErrorCode.NOT_FOUND)
  }
  return { surveyUuid, userGroup }
}
