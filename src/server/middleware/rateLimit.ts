import { Express, Request } from 'express'
import rateLimit from 'express-rate-limit'

import { ExpressInitializer } from '../expressInitializer'
import { ProcessEnv } from '../../processEnv'
import { ApiEndpoint } from '../../api/endpoint'
import { runWithClusterLock } from '../../clusterBus'
import { Logger } from '../../log'
import { RateLimitHitRepository } from '../../repository'
import { PgRateLimitStore } from './rateLimitStore'

const logger = new Logger('RateLimitMiddleware')

const EXPIRED_HITS_SWEEP_LOCK_NAME = 'rate-limit-hit-ttl-sweep'

const toExactPathRegExp = (path: string): RegExp => new RegExp(`^${path}$`)

const rateLimitedPaths = [
  toExactPathRegExp(ApiEndpoint.auth.login()),
  toExactPathRegExp(ApiEndpoint.auth.loginTemp()),
  toExactPathRegExp(ApiEndpoint.auth.tokenRefresh()),
  // Token is in the path; match any public printable-export download.
  /^\/api\/public\/record-export\/[^/]+$/,
]

const getLoginEmail = (req: Request): string =>
  String(req.body?.email ?? '')
    .trim()
    .toLowerCase()

const message = {
  status: 429,
  message: 'Too many requests, please try again later.',
}

export const RateLimitMiddleware: ExpressInitializer = {
  init(express: Express): void {
    if (!ProcessEnv.rateLimitEnabled) {
      logger.debug('Rate limiting is disabled')
      return
    }
    logger.debug(
      `Rate limiting initialized with windowMs=${ProcessEnv.rateLimitWindowMs} and max=${ProcessEnv.rateLimitRequestsPerWindow}`
    )

    const { rateLimitWindowMs: windowMs, rateLimitRequestsPerWindow: limit } = ProcessEnv

    const limiterByIp = rateLimit({ windowMs, limit, message, store: new PgRateLimitStore('ip:') })

    for (const rateLimitedPath of rateLimitedPaths) {
      express.use(rateLimitedPath, limiterByIp)
    }

    // limits password and 2FA code guessing on one account from many IP addresses
    const loginLimiterByAccount = rateLimit({
      windowMs,
      limit,
      message,
      store: new PgRateLimitStore('login-account:'),
      keyGenerator: getLoginEmail,
      skip: (req) => !getLoginEmail(req),
    })
    express.use(toExactPathRegExp(ApiEndpoint.auth.login()), loginLimiterByAccount)

    setInterval(() => {
      runWithClusterLock({
        lockName: EXPIRED_HITS_SWEEP_LOCK_NAME,
        fn: () => RateLimitHitRepository.deleteExpired().then(),
      }).catch((error) => logger.error(`error deleting expired rate limit hits: ${error}`))
    }, windowMs).unref()

    if (ProcessEnv.useHttps) {
      // running behind a proxy (e.g. Heroku, AWS ELB, Nginx) - trust the X-Forwarded-* headers
      const proxies = 1 // number of proxies between user and server
      express.set('trust proxy', proxies)
    }
  },
}
