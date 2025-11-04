import { Express, RequestHandler } from 'express'
import passport from 'passport'
import { Strategy as JWTStrategy, ExtractJwt } from 'passport-jwt'
import { Strategy as LocalStrategy, VerifyFunctionWithRequest } from 'passport-local'

import {
  FieldValidators,
  ServiceRegistry,
  ServiceType,
  User,
  UserAuthTokenPayload,
  UserService,
  UserStatus,
  Validator,
  ValidatorErrorKeys,
} from '@openforis/arena-core'

import { ProcessEnv } from '../../processEnv'
import { ExpressInitializer } from '../expressInitializer'

const allowedPaths = [
  /^\/$/,
  /^\/auth\/login\/?$/,
  /^\/auth\/token\/refresh\/?$/,
  /^\/api\/public\/.*$/,
  /^\/api\/surveyTemplates\/?$/,
  /^\/guest\/.*$/,
  /^\/img\/.*$/,
]

const _verifyCallback: VerifyFunctionWithRequest = async (_, email, password, done) => {
  const sendError = (message: string) => done(null, false, { message })

  const validator = new Validator()

  const { valid: isValidUser } = await validator.validate(
    { email, password },
    { email: [FieldValidators.email('invalid_email')], password: [FieldValidators.required('password_required')] }
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
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: ProcessEnv.userAuthTokenSecret,
    passReqToCallback: true,
  },
  (req, jwtPayload: UserAuthTokenPayload, done) => {
    if (Date.now() > jwtPayload.exp) {
      return done('JWT expired')
    }
    const { userUuid } = jwtPayload
    const service: UserService = ServiceRegistry.getInstance().getService(ServiceType.user)
    service
      .get({ userUuid })
      .then((user) => {
        if (user) {
          // attach user to the request for later use
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

const jwtStrategyName = 'jwt'

const isAuthorizedMiddleware: RequestHandler = (req, res, next) => {
  if (allowedPaths.some((allowedPath) => allowedPath.test(req.path))) {
    next()
  } else {
    passport.authenticate(jwtStrategyName, { session: false }, (err: any, user: User) => {
      if (user) {
        next()
      } else if (err) {
        res.status(401).send({ message: err.toString() })
      } else {
        // user associated to the auth token is missing
        res.status(401).send({ message: 'Unauthorized' })
      }
    })(req, res, next)
  }
}

export const AuthenticationMiddleware: ExpressInitializer = {
  init(express: Express): void {
    express.use(passport.initialize())

    passport.use('local', localStrategy)
    passport.use(jwtStrategyName, jwtStrategy)

    express.use(isAuthorizedMiddleware)
  },
}
