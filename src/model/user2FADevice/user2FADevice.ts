export type User2FADevice = {
  uuid: string
  userUuid: string
  deviceName: string
  secret: string
  enabled: boolean
  backupCodes: string[]
  dateCreated: Date
  dateModified: Date
}

export type User2FADeviceStored = User2FADevice

export type User2FADeviceForClient = Omit<User2FADevice, 'secret' | 'backupCodes'> & {
  backupCodes?: string[] // Only returned when setting up a new device or regenerating backup codes
  otpAuthUrl?: string // Only returned when setting up a new device
  secret?: string // Only returned when setting up a new device
}
