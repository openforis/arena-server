import { SurveyService } from '@openforis/arena-core'

import { SurveyRepository } from '../../repository'

export const getManyByName: SurveyService['getManyByName'] = SurveyRepository.getManyByName
