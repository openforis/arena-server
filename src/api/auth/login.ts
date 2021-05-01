import { Express, Response, Request, NextFunction } from 'express'
import passport from 'passport'
import { Authorizer, ServiceRegistry, ServiceType, SurveyService, User, UserService } from '@openforis/arena-core'

import { ExpressInitializer } from '../../server'
import { ApiEndpoint } from '../endpoint'
import { Logger } from '../../log'
import { AuthGroupRepository } from '../../repository'

const logger = new Logger('AuthAPI')

export const updateUserPrefs = async (userToUpdate: User): Promise<User> => {
  const service = ServiceRegistry.getInstance().getService(ServiceType.user) as UserService
  const user = await service.updateUserPrefs({ userToUpdate })
  return {
    ...user,
    authGroups: await AuthGroupRepository.getMany({ userUuid: user.uuid }),
  }
}

export const deletePrefSurvey = (user: User): User => {
  const surveyId = user.prefs?.surveys?.current
  if (!surveyId) return user
  const current = { current: -1 }
  const surveys = {
    ...user.prefs?.surveys,
    [-1]: { cycle: 0 },
  }

  const _user: User = {
    ...user,
    prefs: {
      ...user.prefs,
      surveys: {
        ...surveys,
        ...current,
      },
    },
  }
  delete _user.prefs?.surveys?.[surveyId]
  return _user
}

const sendResponse = (res: Response, user: User) => res.json({ user })

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
  } catch (error) {
    logger.error(`error loading survey with id ${surveyId}: ${error.toString()}`)
    // Survey not found with user pref
    // removing user pref
    const _user = deletePrefSurvey(user)
    sendResponse(res, await updateUserPrefs(_user))
  }
}

const sendUser = async (options: { res: Response; req: Request; user: User }) => {
  const { res, req, user } = options
  const {
    query: { includeSurvey },
  } = req
  if (includeSurvey) {
    await sendUserSurvey({ res, user })
  } else {
    sendResponse(res, user)
  }
}

const authenticationSuccessful = (req: Request, res: Response, next: NextFunction, user: User) =>
  req.logIn(user, (err) => {
    if (err) next(err)
    else {
      req.session.save(() => sendUser({ res, req, user }))
    }
  })

export const AuthLogin: ExpressInitializer = {
  init: (express: Express): void => {
    express.post(ApiEndpoint.auth.login(), (req, res: Response, next) => {
      passport.authenticate('local', (err, user, info) => {
        if (err) return next(err)
        if (user) return authenticationSuccessful(req, res, next, user)
        return res.status(401).json(info)
      })(req, res, next)
    })
  },
}
