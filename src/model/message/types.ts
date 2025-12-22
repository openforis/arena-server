/**
 * Represents a message status.
 */
export enum MessageStatus {
  draft = 'DRAFT',
  sent = 'SENT',
  archived = 'ARCHIVED',
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
