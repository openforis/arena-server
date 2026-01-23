import crypto from 'node:crypto'
import { UserTempAuthTokenForClient, UserTempAuthTokenStored } from '../../model'

export const hashToken = (token: string): string => crypto.createHash('sha256').update(token).digest('hex')

export const toUserTempAuthTokenForClient = (
  storedAuthToken: UserTempAuthTokenStored,
  tokenPlain?: string
): UserTempAuthTokenForClient => {
  // Exclude tokenHash from the stored token and add the plain token (if provided)
  const { tokenHash: _, ...rest } = storedAuthToken
  return {
    ...rest,
    token: tokenPlain ?? '', // Use the provided plain token or an empty string if not provided
  }
}
