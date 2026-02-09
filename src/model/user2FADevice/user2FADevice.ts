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

export type User2FADeviceForClient = Omit<User2FADevice, 'secret' | 'backupCodes'>

export type User2FADeviceForClientFirstTimeSetup = User2FADeviceForClient & {
  backupCodes: string[] // Plain backup codes are only returned at setup time (not stored in DB in plain form)
  otpAuthUrl: string // OTP auth URL is only returned at setup time (for QR code generation)
  secret: string // Plain secret is only returned at setup time (for users who want to enter it manually instead of using QR code)
}
