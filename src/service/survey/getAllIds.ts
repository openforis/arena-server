import { SurveyService } from '@openforis/arena-core'

import { SurveyRepository } from '../../repository/survey'

export const getAllIds: SurveyService['getAllIds'] = SurveyRepository.getAllIds
