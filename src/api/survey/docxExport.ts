import { Express, Request, Response, NextFunction } from 'express'

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
          const { surveyId, lang, cycle, draft: draftParam } = Requests.getParams(req)
          const draft = draftParam === true || draftParam === 'true'
          const surveyIdNumber = Number(surveyId)

          const buffer = await generateSurveyDocx({
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

          // Name fallback kept local to avoid an extra survey fetch in the API layer.
          const surveyName = `survey_${surveyId}`
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
