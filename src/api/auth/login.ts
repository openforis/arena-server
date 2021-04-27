import { Express, Response, Request, NextFunction } from 'express'
import passport from 'passport'
import { User } from '@openforis/arena-core'

import { ExpressInitializer } from '../../server'
import { ApiEndpoint } from '../endpoint'
// import { Logger } from '../../log/logger'

// const logger = new Logger('AuthAPI')

// ====== DELETE
// export const assocPrefSurveyCurrent = (surveyId) => (user) =>
//   R.pipe(
//     // If the survey is selected for the first time, add the first cycle to its prefs
//     R.when(R.always(R.isNil(getPrefSurveyCycle(surveyId)(user))), assocPrefSurveyCycle(surveyId, Survey.cycleOneKey)),
//     R.assocPath(pathSurveyCurrent, surveyId)
//   )(user)

// export const deletePrefSurvey = (surveyId) => (user) => {
//   const surveyIdPref = getPrefSurveyCurrent(user)
//   return R.pipe(
//     R.when(R.always(String(surveyIdPref) === String(surveyId)), assocPrefSurveyCurrent(null)),
//     R.dissocPath([keys.prefs, keysPrefs.surveys, String(surveyId)])
//   )(user)
// }

const sendResponse = (res: Response, user: User, survey: any = null) => res.json({ user, survey })

// const sendUserSurvey = async (res: any, user: any, _surveyId: any) => {
//   sendResponse(res, user)
//   // try {
//   //   let survey = await SurveyService.fetchSurveyById(surveyId, false, false)
//   //   if (Authorizer.canEditSurvey(user, Survey.getSurveyInfo(survey))) {
//   //     survey = await SurveyService.fetchSurveyById(surveyId, true, true)
//   //   }

//   //   sendResponse(res, user, survey)
//   // } catch (error) {
//   //   logger.error(`error loading survey with id ${surveyId}: ${error.toString()}`)
//   //   // Survey not found with user pref
//   //   // removing user pref
//   //   const _user = User.deletePrefSurvey(surveyId)(user)
//   //   sendResponse(res, await UserService.updateUserPrefs(_user))
//   // }
// }

const sendUser = async (res: Response, user: User) => {
  return sendResponse(res, user)
  // const surveyId = user?.prefs?.surveys?.current //  getPrefSurveyCurrent(user)

  // if (surveyId) await sendUserSurvey(res, user, surveyId)
  // else sendResponse(res, user)
}

const authenticationSuccessful = (req: Request, res: Response, next: NextFunction, user: User) =>
  req.logIn(user, (err) => {
    if (err) next(err)
    else {
      req.session.save(() => sendUser(res, user))
    }
  })

export const AuthLogin: ExpressInitializer = {
  init: (express: Express): void => {
    express.post(ApiEndpoint.auth.login(), (req, res: Response, next) => {
      passport.authenticate('local', (err, user, info) => {
        if (err) return next(err)
        if (!user) res.status(401).json(info)
        else authenticationSuccessful(req, res, next, user)
      })(req, res, next)
    })
  },
}
