import { JobContext } from '@openforis/arena-core'

import { BaseProtocol } from '../db'

export interface JobContextServer extends JobContext {
  tx?: BaseProtocol
}
