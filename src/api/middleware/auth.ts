import { NextFunction, Request, Response } from 'express'
import {
  Authorizer,
  RecordService,
  ServiceRegistry,
  ServiceType,
  SurveyService,
  User,
  Users,
  UserService,
} from '@openforis/arena-core'
import { UnauthorizedError } from '../../server/error'
import { Requests } from '../../utils'

type PermissionFn = (user: User, ...args: Array<any>) => boolean

// Admin
const requireAdminPermission = async (req: Request, _res: Response, next: NextFunction) => {
  const user = Requests.getUser(req)
  if (Users.isSystemAdmin(user)) {
    next()
  } else {
    next(new UnauthorizedError(user.name))
  }
}

const checkPermission = (req: Request, next: NextFunction, permissionFn: PermissionFn, ...args: Array<any>) => {
  const user = Requests.getUser(req)

  if (permissionFn(user, ...args)) {
    next()
  } else {
    next(new UnauthorizedError(user.name))
  }
}

const requirePermission = (permissionFn: PermissionFn) => async (req: Request, _res: Response, next: NextFunction) => {
  try {
    checkPermission(req, next, permissionFn)
  } catch (error) {
    next(error)
  }
}

const requireSurveyPermission =
  (permissionFn: PermissionFn) => async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const { surveyId } = Requests.getParams(req)
      const service = ServiceRegistry.getInstance().getService(ServiceType.survey) as SurveyService
      const survey = await service.get({ surveyId })

      checkPermission(req, next, permissionFn, survey)
    } catch (error) {
      next(error)
    }
  }

const requireRecordPermission =
  (permissionFn: PermissionFn) => async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const { surveyId, recordUuid } = Requests.getParams(req)
      const service = ServiceRegistry.getInstance().getService(ServiceType.record) as RecordService
      const record = await service.get({ surveyId, recordUuid })

      checkPermission(req, next, permissionFn, record)
    } catch (error) {
      next(error)
    }
  }

const requireUserPermission =
  (permissionFn: PermissionFn) => async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const { surveyId, userUuid } = Requests.getParams(req)
      const serviceRegistry = ServiceRegistry.getInstance()
      const surveyService = serviceRegistry.getService(ServiceType.survey) as SurveyService
      const userService = serviceRegistry.getService(ServiceType.user) as UserService
      const survey = await surveyService.get({ surveyId })
      const userToEdit = await userService.get({ userUuid })

      checkPermission(req, next, permissionFn, survey, userToEdit)
    } catch (error) {
      next(error)
    }
  }

export const ApiAuthMiddleware = {
  // Admin
  requireAdminPermission,

  // Survey
  requireSurveyViewPermission: requireSurveyPermission(Authorizer.canViewSurvey),
  requireSurveyEditPermission: requireSurveyPermission(Authorizer.canEditSurvey),
  requireRecordCleansePermission: requireSurveyPermission(Authorizer.canCleanseRecords),

  requireSurveyConfigEditPermission: requireSurveyPermission(Authorizer.canEditSurveyConfig),
  requireSurveyOwnerEditPermission: requireSurveyPermission(Authorizer.canEditSurveyOwner),
  requireSurveyRdbRefreshPermission: requirePermission(Authorizer.canRefreshAllSurveyRdbs),
  requireCanExportSurveysList: requirePermission(Authorizer.canExportSurveysList),

  // Record
  requireRecordListViewPermission: requireSurveyPermission(Authorizer.canViewSurvey),
  requireRecordCreatePermission: requireSurveyPermission(Authorizer.canCreateRecord),
  requireRecordEditPermission: requireRecordPermission(Authorizer.canEditRecord),
  requireRecordViewPermission: requireSurveyPermission(Authorizer.canViewRecord),
  requireRecordAnalysisPermission: requireSurveyPermission(Authorizer.canAnalyzeRecords),

  // User
  requireUserInvitePermission: requireSurveyPermission(Authorizer.canInviteUsers),
  requireUserViewPermission: requireUserPermission(Authorizer.canViewUser),
  requireUserEditPermission: requireUserPermission(Authorizer.canEditUser),
  requireUserRemovePermission: requireUserPermission(Authorizer.canRemoveUser),
}
