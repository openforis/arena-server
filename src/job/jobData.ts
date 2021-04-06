import { User } from '@openforis/arena-core'

export interface JobData {
  surveyId: number
  type: string
  user: User
}
