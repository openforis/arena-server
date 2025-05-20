import { Express, RequestHandler } from 'express'
import passport from 'passport'
import { Strategy as JWTStrategy } from 'passport-jwt'
import { Strategy as LocalStrategy, VerifyFunctionWithRequest } from 'passport-local'

import {
  FieldValidators,
  ServiceRegistry,
  ServiceType,
  User,
  UserService,
  UserStatus,
  Validator,
  ValidatorErrorKeys,
} from '@openforis/arena-core'

import { ProcessEnv } from '../../processEnv'
import { ExpressInitializer } from '../expressInitializer'

const allowedPaths = [/^\/$/, /^\/auth\/login$/, /^\/guest\/.*$/, /^\/img\/.*$/]

const _verifyCallback: VerifyFunctionWithRequest = async (_, email, password, done) => {
  const sendError = (message: string) => done(null, false, { message })

  const validator = new Validator()

  const { valid: isValidUser } = await validator.validate(
    { email },
    { email: [FieldValidators.email('invalid_email')] }
  )

  if (!isValidUser) {
    sendError(ValidatorErrorKeys.user.emailInvalid)
    return
  }

  try {
    const service = ServiceRegistry.getInstance().getService(ServiceType.user) as UserService
    const user = await service.get({ email, password })

    if (!user) {
      sendError(ValidatorErrorKeys.user.userNotFound)
      return
    }

    if (user.status === UserStatus.FORCE_CHANGE_PASSWORD) {
      sendError(ValidatorErrorKeys.user.passwordChangeRequired)
      return
    }

    done(null, user)
  } catch (error: any) {
    sendError(error.toString())
  }
}

const localStrategy = new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true,
  },
  _verifyCallback
)

const jwtStrategy = new JWTStrategy(
  {
    jwtFromRequest: (req) => req.cookies?.jwt,
    secretOrKey: ProcessEnv.sessionIdCookieSecret,
    passReqToCallback: true,
  },
  (req, jwtPayload, done) => {
    if (Date.now() > jwtPayload.expires) {
      return done('JWT expired')
    }
    const { userUuid } = jwtPayload
    const service: UserService = ServiceRegistry.getInstance().getService(ServiceType.user)
    service
      .get({ userUuid })
      .then((user) => {
        if (user) {
          req.user = user
          done(null, user)
        } else {
          done(null, false)
        }
      })
      .catch((error) => {
        done(error, false)
      })
  }
)

const isAuthorizedMiddleware: RequestHandler = (req, res, next) => {
  if (allowedPaths.some((allowedPath) => allowedPath.test(req.path))) {
    next()
  } else {
    passport.authenticate('jwt', { session: false }, (err: any, user: User) => {
      if (err) {
        res.status(401).send({ message: err.toString() })
      } else if (!user) {
        res.status(401).send({ message: 'Unauthorized' })
      } else {
        next()
      }
    })(req, res, next)
  }
}

export const AuthenticationMiddleware: ExpressInitializer = {
  init(express: Express): void {
    express.use(passport.initialize())

    passport.use('local', localStrategy)
    passport.use('jwt', jwtStrategy)

    express.use(isAuthorizedMiddleware)
  },
}
