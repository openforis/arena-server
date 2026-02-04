import { getApiPath } from './common'

export const twoFactor = {
  devices: (): string => getApiPath('2fa', 'devices'),
  devicesCount: (): string => getApiPath('2fa', 'devices', 'count'),
  device: (): string => getApiPath('2fa', 'device', ':deviceUuid'),
  addDevice: (): string => getApiPath('2fa', 'device', 'add'),
  verifyDevice: (): string => getApiPath('2fa', 'device', 'verify'),
  removeDevice: (): string => getApiPath('2fa', 'device', 'remove'),
  renameDevice: (): string => getApiPath('2fa', 'device', 'rename'),
  disableAll: (): string => getApiPath('2fa', 'disable-all'),
  regenerateBackupCodes: (): string => getApiPath('2fa', 'device', 'regenerate-backup-codes'),
  verifyLogin: (): string => getApiPath('2fa', 'verify-login'),
}
