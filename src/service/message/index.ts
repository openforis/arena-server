import { ArenaService } from '@openforis/arena-core'

import { BaseProtocol } from '../../db'
import { Message, MessageRepository } from '../../repository/message'

const { create, deleteByUuid, getAll, getAllSent, getByUuid, update } = MessageRepository

export interface MessageService extends ArenaService {
  create(message: Partial<Message>, client?: BaseProtocol): Promise<Message>

  deleteByUuid(uuid: string, client?: BaseProtocol): Promise<Message | null>

  getAll(client?: BaseProtocol): Promise<Message[]>

  getAllSent(client?: BaseProtocol): Promise<Message[]>

  getByUuid(uuid: string, client?: BaseProtocol): Promise<Message | null>

  update(
    uuid: string,
    message: Partial<Omit<Message, 'uuid' | 'createdByUserUuid' | 'dateCreated' | 'dateModified'>>,
    client?: BaseProtocol
  ): Promise<Message>
}

export const MessageServiceServer: MessageService = {
  create,
  deleteByUuid,
  getAll,
  getAllSent,
  getByUuid,
  update,
}
