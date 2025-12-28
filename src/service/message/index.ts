import { ArenaService, Message } from '@openforis/arena-core'

import { BaseProtocol } from '../../db'
import { MessageRepository } from '../../repository/message'

const { create, count, deleteByUuid, getAll, getAllSent, getByUuid, update } = MessageRepository

export interface MessageService extends ArenaService {
  create(message: Partial<Message>, client?: BaseProtocol): Promise<Message>

  deleteByUuid(uuid: string, client?: BaseProtocol): Promise<Message | null>

  count(): Promise<number>

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
  count,
  getAll,
  getAllSent,
  getByUuid,
  update,
}
