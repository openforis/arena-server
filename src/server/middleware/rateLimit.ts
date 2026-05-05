import { Express } from 'express'
import rateLimit from 'express-rate-limit'

import { ExpressInitializer } from '../expressInitializer'
import { ProcessEnv } from '../../processEnv'
import { ApiEndpoint } from '../../api'
import { Logger } from '../../log'

const logger = new Logger('RateLimitMiddleware')

const rateLimitedPaths = [ApiEndpoint.auth.login(), ApiEndpoint.auth.loginTemp(), ApiEndpoint.auth.tokenRefresh()]

export const RateLimitMiddleware: ExpressInitializer = {
  init(express: Express): void {
    if (!ProcessEnv.rateLimitEnabled) {
      logger.debug('Rate limiting is disabled')
      return
    }
    logger.debug(
      `Rate limiting initialized with windowMs=${ProcessEnv.rateLimitWindowMs} and max=${ProcessEnv.rateLimitRequestsPerWindow}`
    )

    const limiter = rateLimit({
      windowMs: ProcessEnv.rateLimitWindowMs,
      max: ProcessEnv.rateLimitRequestsPerWindow,
      message: {
        status: 429,
        message: 'Too many requests, please try again later.',
      },
    })

    for (const rateLimitedPath of rateLimitedPaths) {
      express.use(rateLimitedPath, limiter)
    }

    if (ProcessEnv.useHttps) {
      // running behind a proxy (e.g. Heroku, AWS ELB, Nginx) - trust the X-Forwarded-* headers
      const proxies = 1 // number of proxies between user and server
      express.set('trust proxy', proxies)
    }
    // Endpoint to get client IP address (for testing purposes)
    express.get('/ip', (request, response) => {
      response.send(request.ip)
    })
  },
}
