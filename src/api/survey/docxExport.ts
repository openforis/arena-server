import { Express, Request, Response, NextFunction } from 'express'
import { ServiceRegistry, ServiceType } from '@openforis/arena-core'

import type { SurveyServiceWithDocx } from '../../service/survey'
import { ExpressInitializer } from '../../server'
import { Requests } from '../../utils'
import { ApiAuthMiddleware } from '../middleware'
import { ApiEndpoint } from '../endpoint'

export const SurveyDocxExport: ExpressInitializer = {
  init: (express: Express): void => {
    express.get(
      ApiEndpoint.survey.docxExport(),
      ApiAuthMiddleware.requireSurveyViewPermission,
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { surveyId, lang, cycle } = Requests.getParams(req)
          const draft = Requests.getBooleanParam('draft')(req)
          const surveyIdNumber = Number(surveyId)
          const surveyService = ServiceRegistry.getInstance().getService(ServiceType.survey) as SurveyServiceWithDocx

          const { buffer, surveyName } = await surveyService.generateDocx({
            surveyId: surveyIdNumber,
            draft,
            lang,
            cycle,
            nodeDefOptions: {
              advanced: false,
              includeDeleted: false,
              includeAnalysis: true,
            },
          })

          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
          res.setHeader('Content-Disposition', `attachment; filename="${surveyName}_form.docx"`)
          res.send(buffer)
        } catch (error) {
          next(error)
        }
      }
    )
  },
}
