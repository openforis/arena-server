import { getApiPath } from './common'

export const userTwoFactorAuth = {
  devices: (): string => getApiPath('2fa', 'devices'),
  devicesCount: (): string => getApiPath('2fa', 'devices', 'count'),
  device: (): string => getApiPath('2fa', 'device', ':deviceUuid'),
  addDevice: (): string => getApiPath('2fa', 'device', 'add'),
  verifyDevice: (): string => getApiPath('2fa', 'device', ':deviceUuid', 'verify'),
  removeDevice: (): string => getApiPath('2fa', 'device', ':deviceUuid', 'remove'),
  disableAll: (): string => getApiPath('2fa', 'devices', 'disable-all'),
  regenerateBackupCodes: (): string => getApiPath('2fa', 'device', ':deviceUuid', 'regenerate-backup-codes'),
  verifyLogin: (): string => getApiPath('2fa', 'verify-login'),
}
