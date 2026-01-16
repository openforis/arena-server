import { NextFunction, Request, Response } from 'express'
import {
  Authorizer,
  DownloadAuthTokenPayload,
  RecordService,
  ServiceRegistry,
  ServiceType,
  SurveyService,
  User,
  UserAuthTokenService,
  Users,
  UserService,
} from '@openforis/arena-core'
import { UnauthorizedError } from '../../server/error'
import { Requests } from '../../utils'
import { jwtDownloadTokenParamName } from '../auth/authApiCommon'

type PermissionFn = (user: User, ...args: Array<any>) => boolean

const sendUnauthorizedError = ({ req = null, next }: { req?: Request | null; next: NextFunction }) => {
  const user = req ? Requests.getUser(req) : null
  const userName = user?.name ?? 'anonymous'
  next(new UnauthorizedError(userName))
}

// Admin
const requireAdminPermission = async (req: Request, _res: Response, next: NextFunction) => {
  const user = Requests.getUser(req)
  if (Users.isSystemAdmin(user)) {
    next()
  } else {
    sendUnauthorizedError({ req, next })
  }
}

const checkPermission = (req: Request, next: NextFunction, permissionFn: PermissionFn, ...args: Array<any>) => {
  const user = Requests.getUser(req)

  if (permissionFn(user, ...args)) {
    next()
  } else {
    sendUnauthorizedError({ req, next })
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

const requireRecordsPermission =
  (permissionFn: PermissionFn) => async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const { surveyId } = Requests.getParams(req)
      const recordUuids: string[] = Requests.getArrayParam<string>('recordUuids')(req)
      const user = Requests.getUser(req)
      const service = ServiceRegistry.getInstance().getService(ServiceType.record) as RecordService
      const records = await service.getManyByUuids({ surveyId, uuids: recordUuids })
      const hasPermission = records.every((record) => permissionFn(user, record))
      if (hasPermission) {
        next()
      } else {
        sendUnauthorizedError({ req, next })
      }
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
      const survey = surveyId ? await surveyService.get({ surveyId }) : undefined
      const userToEdit = await userService.get({ userUuid })

      checkPermission(req, next, permissionFn, survey, userToEdit)
    } catch (error) {
      next(error)
    }
  }

const requireLoggedInUser = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const user = Requests.getUser(req)
    return user ? next() : sendUnauthorizedError({ req, next })
  } catch (error) {
    next(error)
  }
}

const requireDownloadToken = (req: Request & { downloadFileName?: string }, res: Response, next: NextFunction) => {
  const params = Requests.getParams(req)
  const token = params[jwtDownloadTokenParamName]

  if (!token) {
    res.status(401).json({ error: 'Download token is missing' })
    return
  }

  try {
    // verify token
    const serviceRegistry = ServiceRegistry.getInstance()
    const userAuthTokenService: UserAuthTokenService = serviceRegistry.getService(ServiceType.userAuthToken)
    const payload: DownloadAuthTokenPayload = userAuthTokenService.verifyAuthToken(token)

    const { fileName } = payload

    // Ensure this is a valid download token and not a login token
    if (!fileName) {
      res.status(403).json({ error: 'Invalid token: missing fileName in payload' })
      return
    }

    // Attach decoded data to request for the next function
    req['downloadFileName'] = fileName
    next()
  } catch {
    // Handle expired or tampered tokens
    res.status(403).json({ error: 'Download link expired or invalid' })
  }
}

export const ApiAuthMiddleware = {
  requireLoggedInUser,

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
  requireRecordsEditPermission: requireRecordsPermission(Authorizer.canEditRecord),
  requireRecordViewPermission: requireSurveyPermission(Authorizer.canViewRecord),
  requireRecordAnalysisPermission: requireSurveyPermission(Authorizer.canAnalyzeRecords),
  requireRecordListExportPermission: requireSurveyPermission(Authorizer.canExportRecordsList),
  requireRecordOwnerChangePermission: requireRecordPermission(Authorizer.canChangeRecordOwner),
  requireRecordStepEditPermission: requireRecordPermission(Authorizer.canChangeRecordStep),
  requireRecordsExportPermission: requireSurveyPermission(Authorizer.canExportRecords),

  // Map
  requireMapUsePermission: requireSurveyPermission(Authorizer.canUseMap),

  // User
  requireUserNameViewPermission: requireUserPermission(Authorizer.canViewOtherUsersNameInSameSurvey),
  requireUsersAllViewPermission: requirePermission(Authorizer.canViewAllUsers),
  requireUserCreatePermission: requireUserPermission(Authorizer.canCreateUsers),
  requireUserInvitePermission: requireSurveyPermission(Authorizer.canInviteUsers),
  requireUserViewPermission: requireUserPermission(Authorizer.canViewUser),
  requireUserEditPermission: requireUserPermission(Authorizer.canEditUser),
  requireUserRemovePermission: requireUserPermission(Authorizer.canRemoveUser),

  // User access requests
  requireCanViewAccessRequestsPermission: requirePermission(Authorizer.canViewUsersAccessRequests),
  requireCanEditAccessRequestsPermission: requirePermission(Authorizer.canEditUsersAccessRequests),

  requireDownloadToken,
}
