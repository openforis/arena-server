import { Express } from 'express'

import rateLimit from 'express-rate-limit'
import { ExpressInitializer } from '../expressInitializer'

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
  },
}
