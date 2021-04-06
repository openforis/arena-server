import { Survey, User } from '@openforis/arena-core'

export interface JobContext {
  surveyId: number
  survey?: Survey
  user: User
}
