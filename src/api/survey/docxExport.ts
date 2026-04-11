import { Express, Request, Response, NextFunction } from 'express'

import { ServiceRegistry, ServiceType, SurveyService } from '@openforis/arena-core'

import { ExpressInitializer } from '../../server'
import { Requests } from '../../utils'
import { ApiAuthMiddleware } from '../middleware'
import { ApiEndpoint } from '../endpoint'
import { generateSurveyDocx } from '../../service/survey/docxExport'

export const SurveyDocxExport: ExpressInitializer = {
  init: (express: Express): void => {
    express.get(
      ApiEndpoint.survey.docxExport(),
      ApiAuthMiddleware.requireSurveyViewPermission,
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const { surveyId, lang, cycle, draft } = Requests.getParams(req)

          const service = ServiceRegistry.getInstance().getService(ServiceType.survey) as SurveyService
          const survey = await service.get({
            surveyId: Number(surveyId),
            draft: draft === true || draft === 'true',
            nodeDefOptions: {
              include: true,
              advanced: false,
              draft: draft === true || draft === 'true',
            },
          })

          const buffer = await generateSurveyDocx({ survey, lang, cycle })

          const surveyName = (survey.props?.name ?? `survey_${surveyId}`).replace(/[^a-zA-Z0-9_-]/g, '_')
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
