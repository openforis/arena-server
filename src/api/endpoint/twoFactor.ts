import { getPath } from './common'

export const twoFactor = {
  status: (): string => getPath('2fa', 'status'),
  initiate: (): string => getPath('2fa', 'initiate'),
  verify: (): string => getPath('2fa', 'verify'),
  disable: (): string => getPath('2fa', 'disable'),
  regenerateBackupCodes: (): string => getPath('2fa', 'regenerate-backup-codes'),
  verifyLogin: (): string => getPath('2fa', 'verify-login'),
}
