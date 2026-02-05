export type UserTwoFactorDevice = {
  uuid: string
  userUuid: string
  deviceName: string
  secret: string
  enabled: boolean
  backupCodes: string[]
  dateCreated: Date
  dateModified: Date
}

export type UserTwoFactorDeviceStored = UserTwoFactorDevice

export type UserTwoFactorDeviceForClient = Omit<UserTwoFactorDevice, 'secret' | 'backupCodes'> & {
  backupCodes?: string[] // Only returned when setting up a new device or regenerating backup codes
  otpAuthUrl?: string // Only returned when setting up a new device
  secret?: string // Only returned when setting up a new device
}
