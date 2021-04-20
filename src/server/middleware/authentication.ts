import passport from 'passport'
import { VerifyFunctionWithRequest, Strategy as LocalStrategy } from 'passport-local'
import { Express } from 'express'
import { FieldValidators, User, UserStatus, Validator, ValidatorErrorKeys } from '@openforis/arena-core'

import { ExpressInitializer } from '../expressInitializer'
import { UserServiceServer } from '../../service'

const _verifyCallback: VerifyFunctionWithRequest = async (_, email, password, done) => {
  const sendUser = (user: User) => done(null, user)
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

  const user = await UserServiceServer.get({ email, password })

  if (!user) {
    sendError(ValidatorErrorKeys.user.userNotFound)
    return
  }

  if (user.status === UserStatus.ACCEPTED) {
    sendUser(user)
  }

  sendError(ValidatorErrorKeys.user.passwordChangeRequired)
}

const localStrategy = new LocalStrategy(
  {
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true,
  },
  _verifyCallback
)

export const AuthenticationMiddleware: ExpressInitializer = {
  init(express: Express): void {
    express.use(passport.initialize())

    express.use(passport.session())

    passport.use(localStrategy)

    passport.serializeUser((user, done) => done(null, user?.uuid))

    passport.deserializeUser(async (userUuid: string, done) => {
      const user = await UserServiceServer.get({ userUuid })
      done(null, user)
    })
  },
}
