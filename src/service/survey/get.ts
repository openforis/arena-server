import { SurveyService } from '@openforis/arena-core'

import { SurveyRepository } from '../../repository'

export const get: SurveyService['get'] = SurveyRepository.get
