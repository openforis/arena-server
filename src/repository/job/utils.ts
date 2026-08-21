import { JobStatus } from '@openforis/arena-core'

export interface JobRow {
  uuid: string
  userUuid: string
  surveyId: number
  type: string
  status: JobStatus
  processed: number
  total: number
  props: Record<string, unknown>
  dateCreated: Date
  dateModified: Date
}

export const transformCallbackSafe = (row: any): JobRow | null => {
  if (!row) return null
  return {
    uuid: row.uuid,
    userUuid: row.user_uuid,
    surveyId: row.survey_id,
    type: row.type,
    status: row.status as JobStatus,
    processed: row.processed,
    total: row.total,
    props: row.props || {},
    dateCreated: row.date_created,
    dateModified: row.date_modified,
  }
}

export const transformCallback = (row: any): JobRow => transformCallbackSafe(row)!
