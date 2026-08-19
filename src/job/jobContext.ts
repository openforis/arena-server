import { JobContext as CoreJobContext } from '@openforis/arena-core'
import { BaseProtocol } from '../db'

export interface JobContext extends CoreJobContext {
  surveyId: number
  type: string
  tx?: BaseProtocol
}
