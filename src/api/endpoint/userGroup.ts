import { getApiPathSurvey } from './common'

const moduleName = 'user-groups'

export const userGroup = {
  userGroups: (surveyId: string): string => getApiPathSurvey(surveyId, moduleName),
  userGroupsCount: (surveyId: string): string => getApiPathSurvey(surveyId, moduleName, 'count'),
  userGroup: (surveyId: string, groupUuid: string): string => getApiPathSurvey(surveyId, moduleName, groupUuid),
  userGroupMembers: (surveyId: string, groupUuid: string): string =>
    getApiPathSurvey(surveyId, moduleName, groupUuid, 'members'),
  userGroupMember: (surveyId: string, groupUuid: string, userUuid: string): string =>
    getApiPathSurvey(surveyId, moduleName, groupUuid, 'members', userUuid),
}
