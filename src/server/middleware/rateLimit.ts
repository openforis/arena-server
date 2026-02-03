import { Express } from 'express'
import rateLimit from 'express-rate-limit'

import { ExpressInitializer } from '../expressInitializer'
import { ProcessEnv } from '../../processEnv'

const rateLimitedPaths = ['/auth']

export const RateLimitMiddleware: ExpressInitializer = {
  init(express: Express): void {
    if (!ProcessEnv.rateLimitEnabled) {
      return
    }
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
