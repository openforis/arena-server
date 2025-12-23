import { getPath } from './common'

export const message = {
  message: (messageUuid?: string): string => (messageUuid ? getPath('message', messageUuid) : getPath('message')),
  messages: (): string => getPath('messages'),
  messagesCount: (): string => getPath('messages', 'count'),
}
