import { getApiPath } from './common'

export const message = {
  message: (messageUuid?: string): string => (messageUuid ? getApiPath('message', messageUuid) : getApiPath('message')),
  messages: (): string => getApiPath('messages'),
  messagesCount: (): string => getApiPath('messages', 'count'),
}
