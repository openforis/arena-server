import * as speakeasy from 'speakeasy'
import * as QRCode from 'qrcode'
import * as crypto from 'crypto'

import { UserTwoFactorStored, UserTwoFactorForClient } from '../../model'
import { UserTwoFactorRepository } from '../../repository'
import { BaseProtocol, DB } from '../../db'

const APP_NAME = 'Arena'

/**
 * Generates a new 2FA secret and QR code URL for a user.
 */
const generateSecret = async (options: { userEmail: string }): Promise<{ secret: string; qrCodeUrl: string }> => {
  const { userEmail } = options

  const secretData = speakeasy.generateSecret({
    name: `${APP_NAME} (${userEmail})`,
    issuer: APP_NAME,
    length: 32,
  })

  const qrCodeUrl = await QRCode.toDataURL(secretData.otpauth_url || '')

  return {
    secret: secretData.base32 || '',
    qrCodeUrl,
  }
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

  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2, // Allow 2 time steps before and after for clock skew
  })
}

/**
 * Initiates 2FA setup for a user (generates secret and QR code but doesn't enable it yet).
 */
export const initiate = async (options: {
  userUuid: string
  userEmail: string
  client?: BaseProtocol
}): Promise<UserTwoFactorForClient> => {
  const { userUuid, userEmail, client = DB } = options

  // Check if user already has 2FA configured
  const existing = await UserTwoFactorRepository.getByUserUuid(userUuid, client)

  const { secret, qrCodeUrl } = await generateSecret({ userEmail })
  const backupCodes = generateBackupCodes()
  const now = new Date()

  let twoFactor: UserTwoFactorStored

  if (existing) {
    // Update existing record with new secret (not enabled yet)
    twoFactor = await UserTwoFactorRepository.update(
      {
        userUuid,
        secret,
        enabled: false,
        backupCodes,
      },
      client
    )
  } else {
    // Create new record
    twoFactor = await UserTwoFactorRepository.insert(
      {
        userUuid,
        secret,
        enabled: false,
        backupCodes,
        dateCreated: now,
        dateUpdated: now,
      },
      client
    )
  }

  return {
    userUuid: twoFactor.userUuid,
    enabled: twoFactor.enabled,
    dateCreated: twoFactor.dateCreated,
    dateUpdated: twoFactor.dateUpdated,
    qrCodeUrl,
    backupCodes,
  }
}

/**
 * Verifies and enables 2FA for a user.
 */
export const verify = async (options: {
  userUuid: string
  token: string
  client?: BaseProtocol
}): Promise<UserTwoFactorForClient> => {
  const { userUuid, token, client = DB } = options

  const twoFactor = await UserTwoFactorRepository.getByUserUuid(userUuid, client)

  if (!twoFactor) {
    throw new Error('2FA not initialized for this user')
  }

  const isValid = verifyToken({ secret: twoFactor.secret, token })

  if (!isValid) {
    throw new Error('Invalid verification code')
  }

  // Enable 2FA
  const updated = await UserTwoFactorRepository.update(
    {
      userUuid,
      enabled: true,
    },
    client
  )

  return {
    userUuid: updated.userUuid,
    enabled: updated.enabled,
    dateCreated: updated.dateCreated,
    dateUpdated: updated.dateUpdated,
  }
}

/**
 * Disables 2FA for a user.
 */
export const disable = async (options: { userUuid: string; client?: BaseProtocol }): Promise<void> => {
  const { userUuid, client = DB } = options

  await UserTwoFactorRepository.deleteByUserUuid(userUuid, client)
}

/**
 * Gets the 2FA status for a user.
 */
export const getStatus = async (options: {
  userUuid: string
  client?: BaseProtocol
}): Promise<UserTwoFactorForClient | null> => {
  const { userUuid, client = DB } = options

  const twoFactor = await UserTwoFactorRepository.getByUserUuid(userUuid, client)

  if (!twoFactor) {
    return null
  }

  return {
    userUuid: twoFactor.userUuid,
    enabled: twoFactor.enabled,
    dateCreated: twoFactor.dateCreated,
    dateUpdated: twoFactor.dateUpdated,
  }
}

/**
 * Verifies a login attempt with 2FA.
 */
export const verifyLogin = async (options: {
  userUuid: string
  token: string
  client?: BaseProtocol
}): Promise<boolean> => {
  const { userUuid, token, client = DB } = options

  const twoFactor = await UserTwoFactorRepository.getByUserUuid(userUuid, client)

  if (!twoFactor || !twoFactor.enabled) {
    return false
  }

  // Check if it's a backup code
  if (twoFactor.backupCodes && twoFactor.backupCodes.includes(token)) {
    // Remove used backup code
    const updatedCodes = twoFactor.backupCodes.filter((code) => code !== token)
    await UserTwoFactorRepository.update(
      {
        userUuid,
        backupCodes: updatedCodes,
      },
      client
    )
    return true
  }

  // Verify TOTP token
  return verifyToken({ secret: twoFactor.secret, token })
}

/**
 * Regenerates backup codes for a user.
 */
export const regenerateBackupCodes = async (options: {
  userUuid: string
  client?: BaseProtocol
}): Promise<string[]> => {
  const { userUuid, client = DB } = options

  const twoFactor = await UserTwoFactorRepository.getByUserUuid(userUuid, client)

  if (!twoFactor) {
    throw new Error('2FA not configured for this user')
  }

  const backupCodes = generateBackupCodes()

  await UserTwoFactorRepository.update(
    {
      userUuid,
      backupCodes,
    },
    client
  )

  return backupCodes
}

export const UserTwoFactorService = {
  initiate,
  verify,
  disable,
  getStatus,
  verifyLogin,
  regenerateBackupCodes,
}
