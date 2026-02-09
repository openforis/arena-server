import { Express, NextFunction, Request, Response } from 'express'
import passport from 'passport'

import {
  Authorizer,
  Objects,
  ServiceRegistry,
  ServiceType,
  SurveyService,
  User,
  UserAuthTokenService,
  UserService,
  UserStatus,
  UUIDs,
} from '@openforis/arena-core'

import { Logger } from '../../log'
import { ExpressInitializer, ServerServiceType } from '../../server'
import { UserTempAuthTokenService, UserTwoFactorService } from '../../service'
import { Requests } from '../../utils'
import { ApiEndpoint } from '../endpoint'
import { extractRefreshTokenProps, setRefreshTokenCookie } from './authApiCommon'
import { WebSocketEvent, WebSocketServer } from '../../webSocket'

const logger = new Logger('AuthAPI')

export const deletePrefSurvey = (user: User): User => {
  const surveyId = user.prefs?.surveys?.current
  if (!surveyId) return user
  const _user: User = { ...user }
  delete _user.prefs?.surveys?.[surveyId]
  return _user
}

const sendUserSurvey = async (options: { res: Response; user: User; authToken: string }) => {
  const { res, user, authToken } = options
  const serviceRegistry = ServiceRegistry.getInstance()
  const surveyId = user.prefs?.surveys?.current
  try {
    const surveyService = serviceRegistry.getService(ServiceType.survey) as SurveyService
    let survey = null
    if (surveyId) {
      survey = await surveyService.get({ surveyId, draft: false, validate: false })
    }
    if (survey && surveyId && Authorizer.canEditSurvey(user, survey)) {
      survey = await surveyService.get({ surveyId, draft: true, validate: true })
    }
    res.json({ user, survey, authToken })
  } catch (error: any) {
    logger.error(`error loading survey with id ${surveyId}: ${error.toString()}`)
    // Survey not found with user pref
    // removing user pref
    const userToUpdate = deletePrefSurvey(user)
    const userService = serviceRegistry.getService(ServiceType.user) as UserService
    const userUpdated = await userService.updateUserPrefs({ userToUpdate })
    res.json({ user: userUpdated, authToken })
  }
}

const sendUser = async (options: { res: Response; req: Request; user: User; authToken: string }) => {
  const { res, req, user, authToken } = options
  const { includeSurvey } = Requests.getParams(req)
  if (includeSurvey) {
    await sendUserSurvey({ res, user, authToken })
  } else {
    res.json({ user, authToken })
  }
}

const authenticationSuccessful = ({
  req,
  res,
  next,
  user,
  callback,
}: {
  req: Request
  res: Response
  next: NextFunction
  user: User
  callback?: () => void
}) =>
  req.logIn(user, { session: false }, async (err) => {
    if (err) {
      next(err)
      callback?.()
    } else {
      const { uuid: userUuid } = user

      const serviceRegistry = ServiceRegistry.getInstance()
      const userAuthTokenService: UserAuthTokenService = serviceRegistry.getService(ServiceType.userAuthToken)

      const refreshTokenProps = extractRefreshTokenProps({ req })

      userAuthTokenService
        .createUserAuthTokens({ userUuid, props: refreshTokenProps })
        .then(({ authToken, refreshToken }) => {
          setRefreshTokenCookie({ res, refreshToken })
          sendUser({ res, req, user, authToken: authToken.token })
          callback?.()
        })
        .catch((error) => {
          next(error)
          callback?.()
        })
    }
  })

const handleTwoFactorRequired = async ({
  req,
  res,
  userUuid,
}: {
  req: Request
  res: Response
  userUuid: string
}): Promise<boolean> => {
  // 2FA is enabled - require verification
  const { twoFactorToken } = Requests.getParams(req)

  if (!twoFactorToken) {
    // No 2FA token provided - send response indicating 2FA is required
    res.status(200).json({
      twoFactorRequired: true,
      userUuid,
      message: '2FA verification required',
    })
    return false
  }
  // Verify 2FA token against all enabled devices
  const isValid = await UserTwoFactorService.verifyLogin({
    userUuid,
    token: twoFactorToken,
  })
  if (!isValid) {
    res.status(401).json({ message: 'Invalid 2FA code' })
    return false
  }
  return true
}

export const AuthLogin: ExpressInitializer = {
  init: (express: Express): void => {
    express.post(ApiEndpoint.auth.login(), (req: Request, res: Response, next) => {
      passport.authenticate('local', { session: false }, async (err: any, user: User, info: any) => {
        if (err) {
          return next(err)
        }
        if (user) {
          // Check if user has any enabled 2FA devices
          const userUuid = user.uuid
          try {
            const hasEnabled = await UserTwoFactorService.hasEnabledDevices({ userUuid })
            if (hasEnabled) {
              const twoFactorPassed = await handleTwoFactorRequired({ req, res, userUuid })
              if (!twoFactorPassed) {
                return
              }
            }
            // Either 2FA is not enabled or verification was successful
            return authenticationSuccessful({ req, res, next, user })
          } catch (error) {
            return next(error)
          }
        }
        return res.status(401).json(info)
      })(req, res, next)
    })
    express.post(ApiEndpoint.auth.loginTemp(), async (req, res: Response, next) => {
      try {
        const { token } = Requests.getParams(req)
        if (Objects.isEmpty(token) || !UUIDs.isUuid(token)) {
          res.status(400).json({ message: 'Temporary auth token is missing or invalid' })
          return
        }
        const serviceRegistry = ServiceRegistry.getInstance()
        const userTempAuthTokenService: UserTempAuthTokenService = serviceRegistry.getService(
          ServerServiceType.userTempAuthToken
        )
        const tempAuthTokenFound = await userTempAuthTokenService.revoke(token)
        if (!tempAuthTokenFound) {
          res.status(401).json({ message: 'Invalid or expired temporary auth token' })
          return
        }
        const { userUuid } = tempAuthTokenFound
        const userService = serviceRegistry.getService(ServiceType.user) as UserService
        const user = await userService.get({ userUuid })
        if (!user || user.status !== UserStatus.ACCEPTED) {
          res.status(401).json({ message: 'User not found or not accepted for the provided temporary auth token' })
          return
        }

        authenticationSuccessful({
          req,
          res,
          next,
          user,
          callback: () => {
            // notify via WebSocket that temp login was successful
            WebSocketServer.notifyUser(userUuid, WebSocketEvent.tempLoginSuccessful, { token, userUuid })
          },
        })
      } catch (error) {
        next(error)
      }
    })
  },
}
