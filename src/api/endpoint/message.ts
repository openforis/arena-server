import { getApiPath } from './common'

export const message = {
  message: (messageUuid?: string): string => (messageUuid ? getApiPath('message', messageUuid) : getApiPath('message')),
  messages: (): string => getApiPath('messages'),
  messagesCount: (): string => getApiPath('messages', 'count'),
  messagesNotifiedToUser: (): string => getApiPath('messages', 'notified-to-user'),
  messagesNotifiedToUserCount: (): string => getApiPath('messages', 'notified-to-user', 'count'),
}
