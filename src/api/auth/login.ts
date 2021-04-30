import { Express, Response, Request, NextFunction } from 'express'
import passport from 'passport'
import { User } from '@openforis/arena-core'

import { ExpressInitializer } from '../../server'
import { ApiEndpoint } from '../endpoint'

const authenticationSuccessful = (req: Request, res: Response, next: NextFunction, user: User) =>
  req.logIn(user, (err) => {
    if (err) next(err)
    else {
      req.session.save(() => res.json({ user }))
    }
  })

export const AuthLogin: ExpressInitializer = {
  init: (express: Express): void => {
    express.post(ApiEndpoint.auth.login(), (req, res: Response, next) => {
      passport.authenticate('local', (err, user, info) => {
        if (err) return next(err)
        if (user) return authenticationSuccessful(req, res, next, user)
        return res.status(401).json(info)
      })(req, res, next)
    })
  },
}
