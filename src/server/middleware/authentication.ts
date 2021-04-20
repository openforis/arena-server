import passport from 'passport'
import { VerifyFunctionWithRequest, Strategy as LocalStrategy } from 'passport-local'
import bcrypt from 'bcryptjs'
import { Express } from 'express'
import { FieldValidators, User, UserStatus, Validator } from '@openforis/arena-core'

import { ExpressInitializer } from '../expressInitializer'
import { UserServiceServer } from '../../service'
import { UserResetPasswordRepository, AuthGroupRepository } from '../../repository'

const comparePassword = bcrypt.compareSync

// TODO: Handle these separately
const ValidationMessages = {
  emailInvalid: 'validationErrors.user.emailInvalid',
  userNotFound: 'validationErrors.user.userNotFound',
  passwordChangeRequired: 'validationErrors.user.passwordChangeRequired',
}

const _initializeUser = async (_user: User): Promise<User> => {
  const user = { ..._user }
  if (user.password) delete user.password

  // Assoc auth groups
  let userUpdated = {
    ...user,
    authGroups: await AuthGroupRepository.fetchUserGroups({ userUuid: user.uuid }),
  }
  if (user.status === UserStatus.INVITED) {
    const expired = !(await UserResetPasswordRepository.existsResetPasswordValidByUserUuid({ userUuid: user.uuid }))
    userUpdated = {
      ...userUpdated,
      invitation: {
        expired,
      },
    }
  }

  // @ts-ignore fixed by implementing repository method
  return userUpdated
}

const findUserByEmailAndPassword = async (email: string, password: string) => {
  const user = await UserServiceServer.get({ email })

  if (user?.password && (await comparePassword(password, user.password))) {
    return _initializeUser(user)
  }

  return null
}

const _verifyCallback: VerifyFunctionWithRequest = async (_, email, password, done) => {
  const sendUser = (user: User) => done(null, user)
  const sendError = (message: string) => done(null, false, { message })

  const validator = new Validator()

  const { valid: isValidUser } = await validator.validate(
    { email },
    { email: [FieldValidators.email('invalid_email')] }
  )

  if (!isValidUser) {
    sendError(ValidationMessages.emailInvalid)
    return
  }

  const user = await findUserByEmailAndPassword(email, password)

  if (!user) {
    sendError(ValidationMessages.userNotFound)
    return
  }

  if (user.status === UserStatus.ACCEPTED) {
    sendUser(user)
  }

  sendError(ValidationMessages.passwordChangeRequired)
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
