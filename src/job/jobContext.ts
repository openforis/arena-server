import { Survey, User } from '@openforis/arena-core'
import { BaseProtocol } from '../db'

export interface JobContext {
  surveyId: number
  survey?: Survey
  tx?: BaseProtocol<any>
  user: User
}
