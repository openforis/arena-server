import { ActivityLogService } from '@openforis/arena-core'
import { create } from './create'

export const ActivityLogServiceServer: ActivityLogService = {
  create,
}
