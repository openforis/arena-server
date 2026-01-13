import { Express, Request, RequestHandler } from 'express'
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

import { jwtAlgorithms } from '../../service/userAuthToken/userAuthTokenServiceConstants'

const pathsAllowedWithoutAuthentication = [
  /^\/$/,
  /^\/auth\/login\/?$/,
  /^\/auth\/reset-password\/?$/,
  /^\/auth\/token\/refresh\/?$/,
  /^\/api\/public\/.*$/,
  /^\/api\/surveyTemplates\/?$/,
  /^\/api\/user\/request-access\/?$/,
  /^\/guest\/.*$/,
  /^\/img\/.*$/,
]

/**
 * List of API path prefixes used to identify API requests.
 */
const apiPaths = ['/api/', '/auth/']

/**
 * Determines whether the incoming request should be treated as an API request.
 *
 * Only requests whose path starts with one of the prefixes in `apiPaths`
 * (currently `/api/` and `/auth/`) are considered API requests. These routes
 * are subject to API-specific authentication and may return 401 responses when
 * the user is not authenticated or authorized.
 *
 * All other paths (e.g. front-end pages, static assets, or publicly exposed
 * routes) are treated as non-API requests and follow their own authentication
 * and error-handling rules, separate from the API authentication flow.
 */
const isApiRequest = (req: Request): boolean => apiPaths.some((path) => req.path.startsWith(path))

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
    algorithms: jwtAlgorithms,
  },
  (req, jwtPayload: UserAuthTokenPayload, done) => {
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

const isAuthorizedMiddleware: RequestHandler = (req: Request, res, next) => {
  if (pathsAllowedWithoutAuthentication.some((allowedPath) => allowedPath.test(req.path))) {
    next()
  } else {
    passport.authenticate(jwtStrategyName, { session: false }, (err: any, user: User) => {
      if (user) {
        // user is authenticated
        next()
      } else if (isApiRequest(req)) {
        // For API requests, return JSON error
        // For page requests, let them continue to serve the HTML (which will show login form)
        const message = err ? String(err) : 'Unauthorized'
        res.status(401).send({ message })
      } else {
        // Let the request continue to static file middleware
        next()
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
