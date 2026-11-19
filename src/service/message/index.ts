import { ArenaService, ArenaMessage, MessageNotificationType, Messages, ArenaUser } from '@openforis/arena-core'

import { BaseProtocol } from '../../db'
import { MessageRepository } from '../../repository/message'

const { create, count, deleteByUuid, getAll, getAllSent, getByUuid, update } = MessageRepository

export interface MessageService extends ArenaService {
  create(message: Partial<ArenaMessage>, client?: BaseProtocol): Promise<ArenaMessage>

  deleteByUuid(uuid: string, client?: BaseProtocol): Promise<ArenaMessage | null>

  count(): Promise<number>

  getAll(client?: BaseProtocol): Promise<ArenaMessage[]>

  getAllSent(client?: BaseProtocol): Promise<ArenaMessage[]>

  getNotifiedToUser(user: ArenaUser, client?: BaseProtocol): Promise<ArenaMessage[]>

  getByUuid(uuid: string, client?: BaseProtocol): Promise<ArenaMessage | null>

  update(
    uuid: string,
    message: Partial<Omit<ArenaMessage, 'uuid' | 'createdByUserUuid' | 'dateCreated' | 'dateModified'>>,
    client?: BaseProtocol
  ): Promise<ArenaMessage>
}

const getNotifiedToUser = async (user: ArenaUser, client?: BaseProtocol): Promise<ArenaMessage[]> => {
  const messages = await MessageRepository.getAllSent(client)
  const filteredMessages = messages.filter(
    (message) =>
      Messages.getNotificationTypes(message).includes(MessageNotificationType.PushNotification) &&
      Messages.isTargetingUser(user)(message)
  )
  return filteredMessages.map((message) => Messages.clearHiddenProps(message))
}

export const MessageServiceServer: MessageService = {
  create,
  deleteByUuid,
  count,
  getAll,
  getAllSent,
  getNotifiedToUser,
  getByUuid,
  update,
}
