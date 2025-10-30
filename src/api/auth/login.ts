import { Express, NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import passport from 'passport'

import {
  Authorizer,
  ServiceRegistry,
  ServiceType,
  SurveyService,
  User,
  UserRefreshTokenService,
  UserRefreshTokenProps,
  UserService,
} from '@openforis/arena-core'

import { Logger } from '../../log'
import { ProcessEnv } from '../../processEnv'
import { ExpressInitializer } from '../../server'
import { Requests } from '../../utils'
import { ApiEndpoint } from '../endpoint'
import { JwtPayload } from './jwtPayload'

const logger = new Logger('AuthAPI')

const jwtCookieName = 'jwt'
const jwtExpireMs = 60 * 60 * 1000 // 1 hour
const jwtExpiresIn = '1h' // 1 hour
const jwtRefreshTokenCookieName = 'refreshToken'

export const deletePrefSurvey = (user: User): User => {
  const surveyId = user.prefs?.surveys?.current
  if (!surveyId) return user
  const _user: User = { ...user }
  delete _user.prefs?.surveys?.[surveyId]
  return _user
}

const sendUserSurvey = async (options: { res: Response; user: User }) => {
  const { res, user } = options
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
    res.json({ user, survey })
  } catch (error: any) {
    logger.error(`error loading survey with id ${surveyId}: ${error.toString()}`)
    // Survey not found with user pref
    // removing user pref
    const userToUpdate = deletePrefSurvey(user)
    const userService = serviceRegistry.getService(ServiceType.user) as UserService

    res.json({ user: await userService.updateUserPrefs({ userToUpdate }) })
  }
}

const sendUser = async (options: { res: Response; req: Request; user: User }) => {
  const { res, req, user } = options
  const { includeSurvey } = Requests.getParams(req)
  if (includeSurvey) {
    await sendUserSurvey({ res, user })
  } else {
    res.json({ user })
  }
}

const authenticationSuccessful = (req: Request, res: Response, next: NextFunction, user: User) =>
  req.logIn(user, { session: false }, async (err) => {
    if (err) {
      next(err)
    } else {
      const { uuid: userUuid } = user

      const now: number = Date.now()
      const tokenPayload: JwtPayload = {
        userUuid,
        iat: now,
        exp: now + jwtExpireMs,
      }
      const token = jwt.sign(JSON.stringify(tokenPayload), ProcessEnv.refreshTokenSecret, { expiresIn: jwtExpiresIn })

      const refreshTokenProps: UserRefreshTokenProps = { userAgent: req.headers['user-agent'] ?? '' }

      const serviceRegistry = ServiceRegistry.getInstance()
      const userRefreshTokenService: UserRefreshTokenService = serviceRegistry.getService(ServiceType.userRefreshToken)

      userRefreshTokenService
        .create({ userUuid, props: refreshTokenProps })
        .then((refreshTokenObj) => {
          const { token: refreshToken } = refreshTokenObj
          res.cookie(jwtCookieName, token, { httpOnly: true, secure: true })
          res.cookie(jwtRefreshTokenCookieName, refreshToken, { httpOnly: true, secure: true })
          res.status(200)
          sendUser({ res, req, user })
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
        if (err) return next(err)
        if (user) return authenticationSuccessful(req, res, next, user)
        return res.status(401).json(info)
      })(req, res, next)
    })
  },
}
