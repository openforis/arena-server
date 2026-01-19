import { Express, NextFunction, Request, Response } from 'express'
import passport from 'passport'

import {
  Authorizer,
  ServiceRegistry,
  ServiceType,
  SurveyService,
  User,
  UserAuthTokenService,
  UserService,
} from '@openforis/arena-core'

import { Logger } from '../../log'
import { ExpressInitializer, ServerServiceType } from '../../server'
import { UserTempAuthTokenService } from '../../service'
import { Requests } from '../../utils'
import { ApiEndpoint } from '../endpoint'
import { extractRefreshTokenProps, setRefreshTokenCookie } from './authApiCommon'

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

const authenticationSuccessful = (req: Request, res: Response, next: NextFunction, user: User) =>
  req.logIn(user, { session: false }, async (err) => {
    if (err) {
      next(err)
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
        })
        .catch((error) => {
          next(error)
        })
    }
  })

export const AuthLogin: ExpressInitializer = {
  init: (express: Express): void => {
    express.post(ApiEndpoint.auth.login(), (req, res: Response, next) => {
      passport.authenticate('local', { session: false }, (err: any, user: User, info: any) => {
        if (err) {
          return next(err)
        }
        if (user) {
          return authenticationSuccessful(req, res, next, user)
        }
        return res.status(401).json(info)
      })(req, res, next)
    })
    express.post(ApiEndpoint.auth.loginTempAuthToken(), async (req, res: Response, next) => {
      try {
        const { token } = Requests.getParams(req)
        const serviceRegistry = ServiceRegistry.getInstance()
        const userTempAuthTokenService: UserTempAuthTokenService = serviceRegistry.getService(
          ServerServiceType.userTempAuthToken
        )
        const tempAuthTokenFound = await userTempAuthTokenService.getByToken(token)
        if (!tempAuthTokenFound) {
          res.status(401).json({ message: 'Invalid or expired temporary auth token' })
          return
        }
        const { userUuid } = tempAuthTokenFound
        const userService = serviceRegistry.getService(ServiceType.user) as UserService
        const user = await userService.get({ userUuid })
        if (!user) {
          res.status(401).json({ message: 'User not found for the provided temporary auth token' })
          return
        }
        authenticationSuccessful(req, res, next, user)
      } catch (error) {
        next(error)
      }
    })
  },
}
