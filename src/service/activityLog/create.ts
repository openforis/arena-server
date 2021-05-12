import { ActivityLogService } from '@openforis/arena-core'

import { ActivityLogRepository } from '../../repository'

export const create: ActivityLogService['create'] = ActivityLogRepository.create
