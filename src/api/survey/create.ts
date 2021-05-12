import { Express } from 'express'

import { ExpressInitializer } from '../../server'
import { ApiEndpoint } from '../endpoint'
import { ApiAuthMiddleware } from '../middleware'
import { ServiceRegistry, ServiceType, SurveyService, Surveys } from '@openforis/arena-core'
import { Requests } from '../../utils'

export const SurveyCreate: ExpressInitializer = {
  init: (express: Express): void => {
    express.post(ApiEndpoint.survey.create(), ApiAuthMiddleware.requireAdminPermission, async (req, res, next) => {
      try {
        const user = Requests.getUser(req)
        const requestSurvey = req.body

        const service = ServiceRegistry.getInstance().getService(ServiceType.survey) as SurveyService
        const surveys = (await service.getManyByName(requestSurvey.name)) || []

        const validation = await Surveys.validateNewSurvey(requestSurvey, surveys)

        if (validation.valid) {
          const { name, label, lang, template = false } = requestSurvey

          const survey = await service.create({ user, name, label, lang, template })

          res.json({ survey })
        } else {
          res.json({ validation })
        }
      } catch (error) {
        next(error)
      }
    })
  },
}
