import { Express, Response, Request, NextFunction } from 'express'
import passport from 'passport'
import jwt from 'jsonwebtoken'

import { Authorizer, ServiceRegistry, ServiceType, SurveyService, User, UserService } from '@openforis/arena-core'

import { ExpressInitializer } from '../../server'
import { ApiEndpoint } from '../endpoint'
import { Logger } from '../../log'
import { Requests } from '../../utils'
import { ProcessEnv } from '../../processEnv'

const logger = new Logger('AuthAPI')

const jwtExpireMs = 30 * 60 * 1000 // 30 mins

export const deletePrefSurvey = (user: User): User => {
  const surveyId = user.prefs?.surveys?.current
  if (!surveyId) return user
  const _user: User = { ...user }
  delete _user.prefs?.surveys?.[surveyId]
  return _user
}

const sendUserSurvey = async (options: { res: Response; user: User }) => {
  const { res, user } = options
  const surveyId = user.prefs?.surveys?.current
  try {
    const service = ServiceRegistry.getInstance().getService(ServiceType.survey) as SurveyService
    let survey = null
    if (surveyId) {
      survey = await service.get({ surveyId, draft: false, validate: false })
    }
    if (survey && surveyId && Authorizer.canEditSurvey(user, survey)) {
      survey = await service.get({ surveyId, draft: true, validate: true })
    }
    res.json({ user, survey })
  } catch (error: any) {
    logger.error(`error loading survey with id ${surveyId}: ${error.toString()}`)
    // Survey not found with user pref
    // removing user pref
    const userToUpdate = deletePrefSurvey(user)
    const service = ServiceRegistry.getInstance().getService(ServiceType.user) as UserService

    res.json({ user: await service.updateUserPrefs({ userToUpdate }) })
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
  req.logIn(user, { session: false }, (err) => {
    if (err) {
      next(err)
      return
    } else {
      /** assigns payload to req.user */
      const payload = {
        username: user.email,
        expires: Date.now() + jwtExpireMs,
      }
      /** generate a signed json web token and return it in the response */
      const token = jwt.sign(JSON.stringify(payload), ProcessEnv.sessionIdCookieSecret)
      /** assign our jwt to the cookie */
      res.cookie('jwt', token, { httpOnly: true, secure: true })
      res.status(200)
      return sendUser({ res, req, user })
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
