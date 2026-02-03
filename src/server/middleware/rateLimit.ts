import { Express } from 'express'

import rateLimit from 'express-rate-limit'
import { ExpressInitializer } from '../expressInitializer'
import { ProcessEnv } from '../../processEnv'

const rateLimitWindowMs = 15 * 60 * 1000 // 15 minutes
const maxRequestsPerWindow = 100 // limit each IP to 100 requests per windowMs

export const RateLimitMiddleware: ExpressInitializer = {
  init(express: Express): void {
    const limiter = rateLimit({
      windowMs: rateLimitWindowMs,
      max: maxRequestsPerWindow,
      message: {
        status: 429,
        message: 'Too many requests, please try again later.',
      },
    })
    express.use(limiter)

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
