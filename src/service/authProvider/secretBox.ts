import * as crypto from 'node:crypto'

import { ProcessEnv } from '../../processEnv'

// AES-256-GCM envelope: "v1:<base64(iv | tag | ciphertext)>"
const algorithm = 'aes-256-gcm'
const ivLength = 12
const tagLength = 16
const version = 'v1'

const keyRegExp = /^[0-9a-fA-F]{64}$/

export const isSecretEncryptionAvailable = (): boolean =>
  keyRegExp.test(ProcessEnv.authProviderSecretEncryptionKey ?? '')

const getKey = (): Buffer => {
  const hex = ProcessEnv.authProviderSecretEncryptionKey ?? ''
  if (!keyRegExp.test(hex)) {
    throw new Error('AUTH_PROVIDER_SECRET_ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes)')
  }
  return Buffer.from(hex, 'hex')
}

export const encryptSecret = (plain: string): string => {
  const iv = crypto.randomBytes(ivLength)
  const cipher = crypto.createCipheriv(algorithm, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const payload = Buffer.concat([iv, cipher.getAuthTag(), ciphertext])
  return `${version}:${payload.toString('base64')}`
}

export const decryptSecret = (envelope: string): string => {
  const [envelopeVersion, base64] = envelope.split(':')
  if (envelopeVersion !== version || !base64) {
    throw new Error('Invalid encrypted auth provider secret')
  }
  const payload = Buffer.from(base64, 'base64')
  const iv = payload.subarray(0, ivLength)
  const tag = payload.subarray(ivLength, ivLength + tagLength)
  const ciphertext = payload.subarray(ivLength + tagLength)
  const decipher = crypto.createDecipheriv(algorithm, getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}
