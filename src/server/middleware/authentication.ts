import { Express, RequestHandler } from 'express'
import passport from 'passport'
import { VerifyFunctionWithRequest, Strategy as LocalStrategy } from 'passport-local'
import { ExtractJwt, Strategy as JWTStrategy } from 'passport-jwt'
import {
  FieldValidators,
  User,
  UserStatus,
  Validator,
  ValidatorErrorKeys,
  ServiceRegistry,
  ServiceType,
  UserService,
} from '@openforis/arena-core'

import { ProcessEnv } from '../../processEnv'
import { ExpressInitializer } from '../expressInitializer'

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
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: ProcessEnv.sessionIdCookieSecret,
  },
  (jwtPayload, done) => {
    if (Date.now() > jwtPayload.expires) {
      return done(ValidatorErrorKeys.user.authenticationTokenExpired)
    }
    return done(null, jwtPayload)
  }
)

const isAuthorizedMiddleware: RequestHandler = (req, res, next) => {
  const allowedPaths = [/^\/auth\/.*$/, /^\/guest\/.*$/, /^\/img\/.*$/]
  if (allowedPaths.some((allowedPath) => allowedPath.test(req.path))) {
    next()
  } else if (!req.user) {
    res.status(401).send({ message: 'Unauthorized' })
  } else {
    next()
  }
}

export const AuthenticationMiddleware: ExpressInitializer = {
  init(express: Express): void {
    express.use(passport.initialize())

    express.use(passport.session())

    passport.use('local', localStrategy)

    passport.use('jwt', jwtStrategy)

    passport.serializeUser((user, done) => done(null, user?.uuid))

    passport.deserializeUser(async (userUuid: string, done) => {
      const service = ServiceRegistry.getInstance().getService(ServiceType.user) as UserService

      const user: User | null = await service.get({ userUuid })

      done(null, user)
    })

    express.use(isAuthorizedMiddleware)
  },
}
