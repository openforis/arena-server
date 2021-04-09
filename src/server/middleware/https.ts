import { Express } from 'express'

import { Requests } from '../../utils'
import { Logger } from '../../log'
import { Middleware } from './middleware'

const logger: Logger = new Logger('Https Middleware')

export const HttpsMiddleware: Middleware = {
  init(app: Express): void {
    app.use((req, res, next) => {
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
