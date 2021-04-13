import { Express } from 'express'

import { Requests } from '../../utils'
import { Logger } from '../../log'
import { ExpressInitializer } from '../expressInitializer'

const logger: Logger = new Logger('Https Middleware')

export const HttpsMiddleware: ExpressInitializer = {
  init(express: Express): void {
    express.use((req, res, next) => {
      if (Requests.isHttps(req)) {
        next()
      } else {
        const url = `https://${Requests.getHost(req)}${Requests.getUrl(req)}`
        logger.info(`redirecting to ${url}`)
        res.redirect(url)
      }
    })
  },
}
