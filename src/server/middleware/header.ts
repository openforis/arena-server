import { Express } from 'express'

import { ExpressInitializer } from '../expressInitializer'

const bundleRegexp = /^\/bundle-.*\.js(\.map)?$|^\/styles-.*\.css(\.map)?$/
const bustRegexp = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const apiRegexp = /^\/api\/.*/i
const maxAgeSeconds = 60 * 60 * 24 * 365

export const HeaderMiddleware: ExpressInitializer = {
  init(express: Express): void {
    express.use((req, res, next) => {
      if (apiRegexp.test(req.path)) {
        res.set('Cache-Control', 'no-store')
      } else if (bundleRegexp.test(req.path)) {
        res.set('Cache-Control', `public, max-age=${maxAgeSeconds}`)
        //  Resource-reference cache-busted with uuidv4 in the end (see webpack.config.js)
      } else if (req.query.bust && bustRegexp.test(req.query.bust as string)) {
        res.set('Cache-Control', `public, max-age=${maxAgeSeconds}`)
      } else {
        res.set('Cache-Control', 'no-store')
      }

      next()
    })
  },
}
