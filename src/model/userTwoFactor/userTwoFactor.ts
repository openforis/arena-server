export type UserTwoFactor = {
  userUuid: string
  secret: string
  enabled: boolean
  backupCodes: string[]
  dateCreated: Date
  dateUpdated: Date
}

export type UserTwoFactorStored = UserTwoFactor

export type UserTwoFactorForClient = Omit<UserTwoFactor, 'secret' | 'backupCodes'> & {
  qrCodeUrl?: string // Only returned when enabling 2FA
  backupCodes?: string[] // Only returned when enabling 2FA or regenerating backup codes
}
