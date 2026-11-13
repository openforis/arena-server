import { RequestHandler } from 'express'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'

import { ProcessEnv } from '../../processEnv'

export type LoginRateLimitOptions = {
  windowMs: number
  maxFailedAttemptsPerIp: number
  maxFailedAttemptsPerAccount: number
}

const message = {
  status: 429,
  message: 'Too many failed login attempts, please try again later.',
}

const getAccountKey = (body: unknown): string | undefined => {
  const email = (body as { email?: unknown } | undefined)?.email
  if (typeof email !== 'string') return undefined
  const normalized = email.trim().toLowerCase()
  return normalized ? normalized : undefined
}

/**
 * Limits failed login attempts (wrong password or wrong 2FA code), per client IP and per account (email).
 * Successful responses (including the "2FA required" step) are not counted.
 * Must be registered after the JSON body parser, since the account limiter reads the email from the request body.
 * Counters are kept in memory, so they are per server instance.
 */
export const createLoginRateLimiters = (
  options: LoginRateLimitOptions = {
    windowMs: ProcessEnv.loginRateLimitWindowMs,
    maxFailedAttemptsPerIp: ProcessEnv.loginRateLimitMaxFailedAttemptsPerIp,
    maxFailedAttemptsPerAccount: ProcessEnv.loginRateLimitMaxFailedAttemptsPerAccount,
  }
): RequestHandler[] => {
  const { windowMs, maxFailedAttemptsPerIp, maxFailedAttemptsPerAccount } = options

  const perIpLimiter = rateLimit({
    windowMs,
    limit: maxFailedAttemptsPerIp,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => `ip:${ipKeyGenerator(req.ip ?? '')}`,
    message,
  })

  const perAccountLimiter = rateLimit({
    windowMs,
    limit: maxFailedAttemptsPerAccount,
    skipSuccessfulRequests: true,
    skip: (req) => !getAccountKey(req.body),
    keyGenerator: (req) => `account:${getAccountKey(req.body)}`,
    message,
  })

  return [perIpLimiter, perAccountLimiter]
}
