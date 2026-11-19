import { ArenaSurveyService } from '@openforis/arena-core'

import { SurveyRepository } from '../../repository'

export const getAllIds: ArenaSurveyService['getAllIds'] = SurveyRepository.getAllIds
