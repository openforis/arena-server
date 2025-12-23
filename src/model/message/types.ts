export enum MessageStatus {
  Draft = 'draft',
  Sent = 'sent',
  Archived = 'archived',
}

export enum MessageAudience {
  All = 'all',
  Partial = 'partial',
  Individual = 'individual',
}

export enum MessageNotificationType {
  Email = 'email',
  PushNotification = 'push_notification',
}

export type MessageProps = {
  subject: string
  body: string
  audience: MessageAudience
  recipientUserUuids?: string[]
  notificationTypes: MessageNotificationType[]
  scheduledDate?: Date
  validUntil?: Date
}

/**
 * Represents a message record in the database.
 */
export interface Message {
  uuid: string
  status: MessageStatus
  props: Record<string, any>
  createdByUserUuid: string
  dateCreated?: Date
  dateModified?: Date
}
