import { RecordService } from '@openforis/arena-core'

import { RecordRepository } from '../../repository'

export const get: RecordService['get'] = RecordRepository.get

export const getManyByUuids: RecordService['getManyByUuids'] = RecordRepository.getManyByUuids
