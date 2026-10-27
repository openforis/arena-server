import { ServiceRegistry, ServiceType, SurveyService, UserGroup, UserGroupProps } from '@openforis/arena-core'

import { ServerError, ServerErrorCode } from '../../server'
import { ServerServiceType } from '../../server/arenaServer/serverServiceType'
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

/**
 * Keeps in the readable groups of a group only other groups of the same survey (without duplicates).
 */
export const sanitizeReadableGroupUuids = async (params: {
  surveyUuid: string
  groupUuid?: string
  props?: UserGroupProps
}): Promise<UserGroupProps | undefined> => {
  const { surveyUuid, groupUuid, props } = params
  if (!props || props.readableGroupUuids === undefined) return props

  const readableGroupUuids = Array.isArray(props.readableGroupUuids) ? props.readableGroupUuids : []
  const surveyGroups = await getUserGroupService().getAll({ surveyUuid })
  const surveyGroupUuids = new Set(surveyGroups.map((group) => group.uuid))
  return {
    ...props,
    readableGroupUuids: [...new Set(readableGroupUuids)].filter(
      (uuid) => uuid !== groupUuid && surveyGroupUuids.has(uuid)
    ),
  }
}
