import { authenticator } from 'otplib'
import * as crypto from 'node:crypto'
import bcrypt from 'bcryptjs'

import { User2FADevice, User2FADeviceForClient, User2FADeviceForClientFirstTimeSetup } from '../../model'
import { User2FADeviceRepository } from '../../repository'
import { BaseProtocol, DB } from '../../db'
import { ProcessEnv } from '../../processEnv'

const APP_NAME = 'Arena'
const ENCRYPTION_VERSION = 'v1'
const backupCodeHashRounds = 10

export const User2FAServiceErrorMessageKeys = {
  deviceNotFound: 'appErrors.user2FA.deviceNotFound',
  invalidVerificationCode: 'appErrors.user2FA.invalidVerificationCode',
}

const buildSecretKey = (): Buffer => crypto.createHash('sha256').update(ProcessEnv.user2FASecret).digest()

const encryptSecret = (secret: string): string => {
  const iv = crypto.randomBytes(12)
  const key = buildSecretKey()
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [ENCRYPTION_VERSION, iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join('.')
}

const decryptSecret = (secret: string): string => {
  if (!secret.startsWith(`${ENCRYPTION_VERSION}.`)) {
    return secret
  }

  const [version, ivBase64, tagBase64, ciphertextBase64] = secret.split('.')
  if (version !== ENCRYPTION_VERSION || !ivBase64 || !tagBase64 || !ciphertextBase64) {
    throw new Error('Invalid encrypted 2FA secret')
  }

  const key = buildSecretKey()
  const iv = Buffer.from(ivBase64, 'base64')
  const tag = Buffer.from(tagBase64, 'base64')
  const ciphertext = Buffer.from(ciphertextBase64, 'base64')

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

const isBcryptHash = (value: string): boolean => value.startsWith('$2')

const hashBackupCodes = (codes: string[]): string[] => codes.map((code) => bcrypt.hashSync(code, backupCodeHashRounds))

const normalizeBackupCodesAfterPlainMatch = (codes: string[], usedToken: string): string[] => {
  const remainingPlain = codes.filter((code) => !isBcryptHash(code) && code !== usedToken)
  const remainingHashed = codes.filter((code) => isBcryptHash(code))
  return [...remainingHashed, ...hashBackupCodes(remainingPlain)]
}

const findAndConsumeBackupCode = async (
  codes: string[] | undefined,
  token: string
): Promise<{ matched: boolean; updatedCodes?: string[] }> => {
  if (!codes || codes.length === 0) {
    return { matched: false }
  }

  for (const code of codes) {
    if (isBcryptHash(code)) {
      if (await bcrypt.compare(token, code)) {
        return { matched: true, updatedCodes: codes.filter((entry) => entry !== code) }
      }
      continue
    }

    if (code === token) {
      return { matched: true, updatedCodes: normalizeBackupCodesAfterPlainMatch(codes, token) }
    }
  }

  return { matched: false }
}

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

const to2FADeviceForClient = (device: User2FADevice): User2FADeviceForClient => {
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
}): Promise<User2FADeviceForClientFirstTimeSetup> => {
  const { userUuid, userEmail, deviceName, client = DB } = options

  const { secret, otpAuthUrl } = await generateSecret({ userEmail, deviceName })
  const backupCodes = generateBackupCodes()
  const backupCodesHashed = hashBackupCodes(backupCodes)
  const encryptedSecret = encryptSecret(secret)

  const enabled = false
  const device = await User2FADeviceRepository.insert(
    {
      userUuid,
      deviceName,
      secret: encryptedSecret,
      enabled,
      backupCodes: backupCodesHashed,
    },
    client
  )
  return {
    ...to2FADeviceForClient(device),
    backupCodes, // Return plain backup codes only at setup time
    otpAuthUrl, // Return OTP auth URL only at setup time (for QR code generation)
    secret, // Return plain secret only at setup time (for users who want to enter it manually instead of using QR code)
  }
}

const getDeviceSafe = async (
  options: {
    deviceUuid: string
    userUuid: string
  },
  client: BaseProtocol
): Promise<User2FADevice> => {
  const { deviceUuid, userUuid } = options
  const device = await User2FADeviceRepository.getByDeviceUuid({ deviceUuid, userUuid }, client)

  if (!device) {
    throw new Error(User2FAServiceErrorMessageKeys.deviceNotFound)
  }
  return device
}

/**
 * Gets a specific 2FA device by its UUID.
 */
const getDevice = async (
  options: {
    deviceUuid: string
    userUuid: string
  },
  client: BaseProtocol = DB
): Promise<User2FADeviceForClient> => {
  const { deviceUuid, userUuid } = options
  const device = await getDeviceSafe({ deviceUuid, userUuid }, client)
  return to2FADeviceForClient(device)
}

/**
 * Verifies and enables a 2FA device.
 */
const verifyDevice = async (
  options: {
    deviceUuid: string
    userUuid: string
    token1: string
    token2: string
  },
  client: BaseProtocol = DB
): Promise<User2FADeviceForClient> => {
  const { deviceUuid, userUuid, token1, token2 } = options

  const device = await getDeviceSafe({ deviceUuid, userUuid }, client)
  const secret = decryptSecret(device.secret)

  // Verify the provided tokens against the secret
  const isValid = token1 !== token2 && [token1, token2].every((token) => verifyToken({ secret, token }))
  if (!isValid) {
    throw new Error(User2FAServiceErrorMessageKeys.invalidVerificationCode)
  }
  // Enable the device
  const enabled = true
  const updated = await User2FADeviceRepository.update({ uuid: deviceUuid, enabled }, client)
  return to2FADeviceForClient(updated)
}

/**
 * Removes a 2FA device.
 */
const removeDevice = async (
  options: {
    deviceUuid: string
    userUuid: string
  },
  client: BaseProtocol = DB
): Promise<void> => {
  const { deviceUuid, userUuid } = options
  await User2FADeviceRepository.deleteByDeviceUuid({ deviceUuid, userUuid }, client)
}

/**
 * Disables all 2FA devices for a user.
 */
const disableAll = async (options: { userUuid: string; client?: BaseProtocol }): Promise<void> => {
  const { userUuid, client = DB } = options

  await User2FADeviceRepository.deleteByUserUuid(userUuid, client)
}

/**
 * Counts the number of 2FA devices for a user.
 */
const countDevices = async (options: { userUuid: string; client?: BaseProtocol }): Promise<number> => {
  const { userUuid, client = DB } = options

  return User2FADeviceRepository.countByUserUuid(userUuid, client)
}

/**
 * Gets all 2FA devices for a user.
 */
const getDevices = async (options: { userUuid: string; client?: BaseProtocol }): Promise<User2FADeviceForClient[]> => {
  const { userUuid, client = DB } = options

  const devices = await User2FADeviceRepository.getByUserUuid(userUuid, client)

  return devices.map(to2FADeviceForClient)
}

/**
 * Checks if user has any enabled 2FA devices.
 */
const hasEnabledDevices = async (options: { userUuid: string; client?: BaseProtocol }): Promise<boolean> => {
  const { userUuid, client = DB } = options

  const enabledDevices = await User2FADeviceRepository.getEnabledByUserUuid(userUuid, client)

  return enabledDevices.length > 0
}

/**
 * Verifies a login attempt with 2FA against any enabled device.
 */
const verifyLogin = async (options: { userUuid: string; token: string; client?: BaseProtocol }): Promise<boolean> => {
  const { userUuid, token, client = DB } = options

  const enabledDevices = await User2FADeviceRepository.getEnabledByUserUuid(userUuid, client)

  if (enabledDevices.length === 0) {
    return false
  }

  // Check if token matches any enabled device
  for (const device of enabledDevices) {
    const { uuid: deviceUuid, backupCodes } = device
    // Check if it's a backup code
    const { matched, updatedCodes } = await findAndConsumeBackupCode(backupCodes, token)
    if (matched) {
      await User2FADeviceRepository.update({ uuid: deviceUuid, backupCodes: updatedCodes ?? [] }, client)
      return true
    }
    // Verify TOTP token
    const secret = decryptSecret(device.secret)
    if (verifyToken({ secret, token })) {
      return true
    }
  }
  return false
}

/**
 * Regenerates backup codes for a specific device.
 */
const regenerateBackupCodes = async (
  options: {
    deviceUuid: string
    userUuid: string
  },
  client: BaseProtocol = DB
): Promise<string[]> => {
  const { deviceUuid, userUuid } = options

  await getDeviceSafe({ deviceUuid, userUuid }, client)

  const backupCodes = generateBackupCodes()
  const backupCodesHashed = hashBackupCodes(backupCodes)

  await User2FADeviceRepository.update({ uuid: deviceUuid, backupCodes: backupCodesHashed }, client)

  return backupCodes
}

/**
 * Updates a device name.
 */
const updateDeviceName = async (
  options: {
    deviceUuid: string
    deviceName: string
    userUuid: string
  },
  client: BaseProtocol = DB
): Promise<User2FADeviceForClient> => {
  const { deviceUuid, deviceName, userUuid } = options

  await getDeviceSafe({ deviceUuid, userUuid }, client)

  const updated = await User2FADeviceRepository.update({ uuid: deviceUuid, deviceName }, client)

  return to2FADeviceForClient(updated)
}

export const User2FAServiceServer = {
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

export type User2FAService = typeof User2FAServiceServer
