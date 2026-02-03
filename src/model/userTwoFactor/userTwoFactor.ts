export type UserTwoFactorDevice = {
  uuid: string
  userUuid: string
  deviceName: string
  secret: string
  enabled: boolean
  backupCodes: string[]
  dateCreated: Date
  dateUpdated: Date
}

export type UserTwoFactorDeviceStored = UserTwoFactorDevice

export type UserTwoFactorDeviceForClient = Omit<UserTwoFactorDevice, 'secret' | 'backupCodes'> & {
  qrCodeUrl?: string // Only returned when setting up a new device
  backupCodes?: string[] // Only returned when setting up a new device or regenerating backup codes
}
