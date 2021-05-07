import { Express } from 'express'

import { ExpressInitializer } from '../../server'
import { ApiEndpoint } from '../endpoint'
import { ApiAuthMiddleware } from '../middleware'
import { Validator, FieldValidators, ValidatorErrorKeys, SurveyFactory } from '@openforis/arena-core'

export const SurveyCreate: ExpressInitializer = {
  init: (express: Express): void => {
    express.post(ApiEndpoint.survey.create(), ApiAuthMiddleware.requireAdminPermission, async (req, res, next) => {
      try {
        // const user = Requests.getUser(req)
        const requestSurvey = req.body

        // const service = ServiceRegistry.getInstance().getService(ServiceType.survey) as SurveyService

        // TODO: Move survey validation out
        //  ["id", "uuid", "published", "draft", "ownerUuid", "authGroups", "props", "template"]
        const fieldValidators = {
          ownerUuid: [FieldValidators.required('required_field')],
          authGroups: [FieldValidators.required('required_field')],
          props: [FieldValidators.required('required_field')],
        }
        // TODO:
        // "name", "languages", "labels", "srs", "cycles", "descriptions", "collectUri"
        const fieldValidatorsProps = {
          name: [
            FieldValidators.required(ValidatorErrorKeys.nameRequired),
            FieldValidators.notKeyword(ValidatorErrorKeys.nameCannotBeKeyword),
          ],
          languages: [FieldValidators.required(ValidatorErrorKeys.surveyInfoEdit.langRequired)],
          srs: [FieldValidators.required(ValidatorErrorKeys.surveyInfoEdit.srsRequired)],
        }
        const validator = new Validator()
        const validation = {
          survey: await validator.validate(requestSurvey, fieldValidators),
          surveyProps: await validator.validate(requestSurvey.props, fieldValidatorsProps),
        }
        if (validation.survey.valid && validation.surveyProps.valid) {
          const newSurvey = SurveyFactory.createInstance(...requestSurvey)
          // const survey = await SurveyService.insertSurvey({ user, surveyInfo: surveyInfoTarget })

          res.json({ survey: newSurvey })
          return
        } else {
          res.json({ validation })
          return
        }
      } catch (error) {
        next(error)
      }
    })
  },
}
