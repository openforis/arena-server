/**
 * Represents an info record in the database.
 * The info table is a simple key-value store for system configuration and metadata.
 */
export interface InfoItem {
  key: InfoItemKey
  value: string
  modifiedDate: Date
}

export enum InfoItemKey {
  appVersion = 'appVersion',
}
