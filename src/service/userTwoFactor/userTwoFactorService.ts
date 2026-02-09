import { authenticator } from 'otplib'
import * as crypto from 'crypto'

import { UserTwoFactorDevice, UserTwoFactorDeviceForClient } from '../../model'
import { UserTwoFactorRepository } from '../../repository'
import { BaseProtocol, DB } from '../../db'

const APP_NAME = 'Arena'

const deviceNotFoundErrorMessageKey = 'Device not found'

/**
 * Generates a new 2FA secret and QR code URL for a device.
 */
const generateSecret = async (options: {
  userEmail: string
  deviceName: string
}): Promise<{ secret: string; otpAuthUrl: string }> => {
  const { userEmail, deviceName } = options

  const secret = authenticator.generateSecret()
  const accountName = `${deviceName} - ${userEmail}`
  const otpAuthUrl = authenticator.keyuri(accountName, APP_NAME, secret)

  return { secret, otpAuthUrl }
}

/**
 * Generates backup codes for 2FA recovery.
 */
const generateBackupCodes = (): string[] => {
  const codes: string[] = []
  for (let i = 0; i < 8; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    codes.push(code)
  }
  return codes
}

/**
 * Verifies a TOTP token against a secret.
 */
const verifyToken = (options: { secret: string; token: string }): boolean => {
  const { secret, token } = options

  // Set window to allow for clock skew (2 time steps before and after)
  authenticator.options = { window: 2 }

  return authenticator.verify({ token, secret })
}

const toTwoFactorDeviceForClient = (device: UserTwoFactorDevice): UserTwoFactorDeviceForClient => {
  const { uuid, userUuid, deviceName, enabled, dateCreated, dateModified } = device
  return { uuid, userUuid, deviceName, enabled, dateCreated, dateModified }
}

/**
 * Initiates 2FA setup for a new device (generates secret and QR code but doesn't enable it yet).
 */
const addDevice = async (options: {
  userUuid: string
  userEmail: string
  deviceName: string
  client?: BaseProtocol
}): Promise<UserTwoFactorDeviceForClient> => {
  const { userUuid, userEmail, deviceName, client = DB } = options

  const { secret, otpAuthUrl } = await generateSecret({ userEmail, deviceName })
  const backupCodes = generateBackupCodes()

  const enabled = false
  const twoFactorDevice = await UserTwoFactorRepository.insert(
    {
      userUuid,
      deviceName,
      secret,
      enabled,
      backupCodes,
    },
    client
  )
  return {
    ...toTwoFactorDeviceForClient(twoFactorDevice),
    backupCodes,
    otpAuthUrl,
    secret,
  }
}

const getDeviceSafe = async (deviceUuid: string, client: BaseProtocol): Promise<UserTwoFactorDevice> => {
  const device = await UserTwoFactorRepository.getByDeviceUuid(deviceUuid, client)

  if (!device) {
    throw new Error(deviceNotFoundErrorMessageKey)
  }
  return device
}

/**
 * Gets a specific 2FA device by its UUID.
 */
const getDevice = async (options: {
  deviceUuid: string
  client?: BaseProtocol
}): Promise<UserTwoFactorDeviceForClient> => {
  const { deviceUuid, client = DB } = options

  const device = await getDeviceSafe(deviceUuid, client)

  return toTwoFactorDeviceForClient(device)
}

/**
 * Verifies and enables a 2FA device.
 */
const verifyDevice = async (options: {
  deviceUuid: string
  token1: string
  token2: string
  client?: BaseProtocol
}): Promise<UserTwoFactorDeviceForClient> => {
  const { deviceUuid, token1, token2, client = DB } = options

  const device = await getDeviceSafe(deviceUuid, client)
  const { secret } = device

  // Verify the provided tokens against the secret
  const isValid = [token1, token2].every((token) => verifyToken({ secret, token }))
  if (!isValid) {
    throw new Error('Invalid verification code')
  }
  // Enable the device
  const enabled = true
  const updated = await UserTwoFactorRepository.update({ uuid: deviceUuid, enabled }, client)
  return toTwoFactorDeviceForClient(updated)
}

/**
 * Removes a 2FA device.
 */
const removeDevice = async (options: { deviceUuid: string; client?: BaseProtocol }): Promise<void> => {
  const { deviceUuid, client = DB } = options

  await UserTwoFactorRepository.deleteByDeviceUuid(deviceUuid, client)
}

/**
 * Disables all 2FA devices for a user.
 */
const disableAll = async (options: { userUuid: string; client?: BaseProtocol }): Promise<void> => {
  const { userUuid, client = DB } = options

  await UserTwoFactorRepository.deleteByUserUuid(userUuid, client)
}

/**
 * Counts the number of 2FA devices for a user.
 */
const countDevices = async (options: { userUuid: string; client?: BaseProtocol }): Promise<number> => {
  const { userUuid, client = DB } = options

  return UserTwoFactorRepository.countByUserUuid(userUuid, client)
}

/**
 * Gets all 2FA devices for a user.
 */
const getDevices = async (options: {
  userUuid: string
  client?: BaseProtocol
}): Promise<UserTwoFactorDeviceForClient[]> => {
  const { userUuid, client = DB } = options

  const devices = await UserTwoFactorRepository.getByUserUuid(userUuid, client)

  return devices.map(toTwoFactorDeviceForClient)
}

/**
 * Checks if user has any enabled 2FA devices.
 */
const hasEnabledDevices = async (options: { userUuid: string; client?: BaseProtocol }): Promise<boolean> => {
  const { userUuid, client = DB } = options

  const devices = await UserTwoFactorRepository.getByUserUuid(userUuid, client)

  return devices.some((device) => device.enabled)
}

/**
 * Verifies a login attempt with 2FA against any enabled device.
 */
const verifyLogin = async (options: { userUuid: string; token: string; client?: BaseProtocol }): Promise<boolean> => {
  const { userUuid, token, client = DB } = options

  const devices = await UserTwoFactorRepository.getByUserUuid(userUuid, client)
  const enabledDevices = devices.filter((device) => device.enabled)

  if (enabledDevices.length === 0) {
    return false
  }

  // Check if token matches any enabled device
  for (const device of enabledDevices) {
    // Check if it's a backup code
    if (device.backupCodes?.includes(token)) {
      // Remove used backup code
      const updatedCodes = device.backupCodes.filter((code) => code !== token)
      await UserTwoFactorRepository.update(
        {
          uuid: device.uuid,
          backupCodes: updatedCodes,
        },
        client
      )
      return true
    }

    // Verify TOTP token
    if (verifyToken({ secret: device.secret, token })) {
      return true
    }
  }

  return false
}

/**
 * Regenerates backup codes for a specific device.
 */
const regenerateBackupCodes = async (options: { deviceUuid: string; client?: BaseProtocol }): Promise<string[]> => {
  const { deviceUuid, client = DB } = options

  await getDeviceSafe(deviceUuid, client)

  const backupCodes = generateBackupCodes()

  await UserTwoFactorRepository.update(
    {
      uuid: deviceUuid,
      backupCodes,
    },
    client
  )

  return backupCodes
}

/**
 * Updates a device name.
 */
const updateDeviceName = async (options: {
  deviceUuid: string
  deviceName: string
  client?: BaseProtocol
}): Promise<UserTwoFactorDeviceForClient> => {
  const { deviceUuid, deviceName, client = DB } = options

  const updated = await UserTwoFactorRepository.update(
    {
      uuid: deviceUuid,
      deviceName,
    },
    client
  )
  return toTwoFactorDeviceForClient(updated)
}

export const UserTwoFactorService = {
  deviceNotFoundErrorMessageKey,
  addDevice,
  verifyDevice,
  removeDevice,
  disableAll,
  countDevices,
  getDevices,
  getDevice,
  hasEnabledDevices,
  verifyLogin,
  regenerateBackupCodes,
  updateDeviceName,
}
