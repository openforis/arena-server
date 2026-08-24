import { assocSocket } from './assocSocket'
import { dissocSocket } from './dissocSocket'
import { dissocSocketBySocketId } from './dissocSocketBySocketId'
import { dissocSocketsByRecordUuid } from './dissocSocketsByRecordUuid'
import { getSocketIdsByRecordUuid } from './getSocketIdsByRecordUuid'

export const RecordSocketAssociationRepository = {
  assocSocket,
  dissocSocket,
  dissocSocketBySocketId,
  dissocSocketsByRecordUuid,
  getSocketIdsByRecordUuid,
}
