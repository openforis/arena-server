import * as crypto from 'node:crypto'
import jwt from 'jsonwebtoken'

import { ProcessEnv } from '../../processEnv'
import { ExternalLoginFlowChecks } from './oidcAdapter'

export enum ExternalLoginMode {
  login = 'login',
  invitation = 'invitation',
  link = 'link',
  test = 'test',
}

/**
 * State of a sign-in in progress, kept in a signed cookie between the start and the callback.
 */
export interface ExternalLoginFlow extends ExternalLoginFlowChecks {
  providerId: string
  mode: ExternalLoginMode
  redirectUri: string
  // relative app path to go back to (link and test modes)
  returnTo?: string
  // invitation mode: reset password (invitation) uuid
  invitationUuid?: string
  // link and test modes: user who started the flow
  userUuid?: string
  // invitation mode: name typed on the accept invitation page
  name?: string
}

/**
 * Login completed at the provider but waiting for the Arena 2FA code.
 */
export interface PendingTwoFactorLogin {
  userUuid: string
  providerId: string
}

/**
 * Short-lived ticket proving that a logged-in user started a link or test flow.
 */
export interface ExternalLoginTicket {
  userUuid: string
  providerId: string
  mode: ExternalLoginMode.link | ExternalLoginMode.test
}

enum TokenPurpose {
  flow = 'externalLoginFlow',
  pendingTwoFactor = 'externalLoginPending2FA',
  ticket = 'externalLoginTicket',
  testResult = 'externalLoginTestResult',
}

const expiresInSecondsByPurpose: Record<TokenPurpose, number> = {
  [TokenPurpose.flow]: 10 * 60,
  [TokenPurpose.pendingTwoFactor]: 5 * 60,
  [TokenPurpose.ticket]: 2 * 60,
  [TokenPurpose.testResult]: 5 * 60,
}

// one key per purpose, so that a token cannot be used for another purpose
const getKey = (purpose: TokenPurpose): string =>
  crypto.createHmac('sha256', ProcessEnv.userAuthTokenSecret).update(purpose).digest('hex')

const sign = (purpose: TokenPurpose, payload: object): string =>
  jwt.sign({ data: payload }, getKey(purpose), {
    algorithm: 'HS256',
    expiresIn: expiresInSecondsByPurpose[purpose],
  })

const verify = <T>(purpose: TokenPurpose, token: string | undefined): T | null => {
  if (!token) return null
  try {
    const decoded = jwt.verify(token, getKey(purpose), { algorithms: ['HS256'] }) as { data: T }
    return decoded.data
  } catch {
    return null
  }
}

export const ExternalLoginTokens = {
  maxAgeMsByKind: {
    flow: expiresInSecondsByPurpose[TokenPurpose.flow] * 1000,
    pendingTwoFactor: expiresInSecondsByPurpose[TokenPurpose.pendingTwoFactor] * 1000,
    testResult: expiresInSecondsByPurpose[TokenPurpose.testResult] * 1000,
  },
  signFlow: (flow: ExternalLoginFlow): string => sign(TokenPurpose.flow, flow),
  verifyFlow: (token?: string) => verify<ExternalLoginFlow>(TokenPurpose.flow, token),
  signPendingTwoFactor: (pending: PendingTwoFactorLogin): string => sign(TokenPurpose.pendingTwoFactor, pending),
  verifyPendingTwoFactor: (token?: string) => verify<PendingTwoFactorLogin>(TokenPurpose.pendingTwoFactor, token),
  signTicket: (ticket: ExternalLoginTicket): string => sign(TokenPurpose.ticket, ticket),
  verifyTicket: (token?: string) => verify<ExternalLoginTicket>(TokenPurpose.ticket, token),
  signTestResult: (result: object): string => sign(TokenPurpose.testResult, result),
  verifyTestResult: (token?: string) => verify<object>(TokenPurpose.testResult, token),
}
