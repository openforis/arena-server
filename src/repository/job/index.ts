import { failOrphanedByInstanceId } from './failOrphanedByInstanceId'
import { getActiveByUserUuid } from './getActiveByUserUuid'
import { getActiveBySurveyId } from './getActiveBySurveyId'
import { getByUuid } from './getByUuid'
import { insert } from './insert'
import { updateProgress } from './updateProgress'
import { updateStatus } from './updateStatus'

export const JobRepository = {
  insert,
  updateStatus,
  updateProgress,
  getByUuid,
  getActiveByUserUuid,
  getActiveBySurveyId,
  failOrphanedByInstanceId,
}

export type { JobRow } from './utils'
