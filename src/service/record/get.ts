import { ArenaRecordService } from '@openforis/arena-core'

import { RecordRepository } from '../../repository'

export const get: ArenaRecordService['get'] = RecordRepository.get

export const getManyByUuids: ArenaRecordService['getManyByUuids'] = RecordRepository.getManyByUuids
