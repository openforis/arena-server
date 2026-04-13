import { generateSurveyDocx, SurveyDocxOptions, SurveyDocxResult } from './docxExport'
import { get, SurveyGetOptions } from './get'

export type GenerateSurveyDocxOptions = Omit<SurveyGetOptions, 'surveyId'> &
  Pick<SurveyDocxOptions, 'lang' | 'record'> & {
    surveyId: number
  }

export const generateDocx = async (options: GenerateSurveyDocxOptions): Promise<SurveyDocxResult> => {
  const { lang, record, ...getOptions } = options
  const { cycle } = getOptions

  const survey = await get(getOptions)

  return generateSurveyDocx({ survey, lang, cycle, record })
}
