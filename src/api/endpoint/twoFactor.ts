import { getPath } from './common'

export const twoFactor = {
  devices: (): string => getPath('2fa', 'devices'),
  addDevice: (): string => getPath('2fa', 'device', 'add'),
  verifyDevice: (): string => getPath('2fa', 'device', 'verify'),
  removeDevice: (): string => getPath('2fa', 'device', 'remove'),
  renameDevice: (): string => getPath('2fa', 'device', 'rename'),
  disableAll: (): string => getPath('2fa', 'disable-all'),
  regenerateBackupCodes: (): string => getPath('2fa', 'device', 'regenerate-backup-codes'),
  verifyLogin: (): string => getPath('2fa', 'verify-login'),
}
