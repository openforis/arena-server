import { SurveyService } from '@openforis/arena-core'

import { SurveyRepository } from '../../repository'

export const getAllIds: SurveyService['getAllIds'] = SurveyRepository.getAllIds
