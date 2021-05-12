import { ActivityLogType, LanguageCode, Survey, SurveyFactory, SurveyService, User } from '@openforis/arena-core'

import { ActivityLogRepository, SurveyRepository, UserRepository } from '../../repository'
import { BaseProtocol, DB, DBMigrator } from '../../db'

export const create: SurveyService['create'] = async (
  params: {
    user: User
    name: string
    lang: LanguageCode
    label: string
    template: boolean
    createRootEntityDef?: boolean
    system?: boolean
  },
  client: BaseProtocol = DB
) => {
  const { user, name, lang, label, template, createRootEntityDef = true, system = false } = params
  // const surveyService = ServiceRegistry.getInstance().getService(ServiceType.survey) as SurveyService
  // const userService = ServiceRegistry.getInstance().getService(ServiceType.user) as UserService
  // const nodeDefService = ServiceRegistry.getInstance().getService(ServiceType.nodeDef) as NodeDefService

  const survey = client.tx(async (t) => {
    // TODO: Imeplement method
    const newSurvey = SurveyFactory.createInstance({
      ownerUuid: user.uuid,
      name,
      label,
      languages: [lang],
      template,
    })

    const _survey: Survey = await SurveyRepository.create(
      {
        survey: newSurvey,
        propsDraft: newSurvey.props,
      },
      t
    )

    const surveyId = _survey.id

    if (!surveyId) return null

    // Create survey data schema
    await DBMigrator.migrateSurveySchema(surveyId)

    // Log survey create activity
    await ActivityLogRepository.create(
      {
        user,
        surveyId,
        type: ActivityLogType.surveyCreate,
        content: _survey,
        system,
      },
      t
    )

    // TODO:
    if (createRootEntityDef) {
      //   // Insert root entity def
      //   const rootEntityDef = NodeDefFactory.createInstance(
      //     null,
      //     'entity',
      //     0, // Use first (and only) cycle
      //     {
      //       name: 'root_entity',
      //       multiple: false,
      //       layout: {}, // TODO: NodeDefLayout.newLayout(
      //       // Survey.cycleOneKey,
      //       // NodeDefLayout.renderType.form,
      //       // uuidv4()
      //       // ),
      //     }
      //   )
      //   // TODO:
      //   // await nodeDefService.insertNodeDef({ user, surveyId, nodeDef: rootEntityDef, system: true }, t)
    }

    // Update user prefs
    const userToUpdate: User = {
      ...user,
      prefs: {
        ...user.prefs,
        surveys: {
          ...user.prefs?.surveys,
          [surveyId]: { cycle: 0 },
          current: surveyId,
        },
      },
    }

    await UserRepository.updateUserPrefs({ userToUpdate }, t)

    // Create default groups for this survey
    // TODO: _survey.authGroups = await AuthGroupRepository.createSurveyGroups(surveyId, Survey.getDefaultAuthGroups(), t)

    // Add user to survey admins group (if not system admin)
    // TODO:
    // if (!Users.isSystemAdmin(user)) {
    //   await UserManager.addUserToGroup(
    //     user,
    //     surveyId,
    //     AuthGroup.getUuid(Survey.getAuthGroupAdmin(surveyInfo)),
    //     user.uuid,
    //     t
    //   )
    // }

    return _survey
  })

  return survey
}
