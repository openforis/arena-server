import { User, UserService, UserStatus } from '@openforis/arena-core'
import { AuthGroupRepository, UserRepository, UserResetPasswordRepository } from '../../repository'

const _initializeUser = async (user: User): Promise<User> => {
  // Assoc auth groups
  let userUpdated = {
    ...user,
    authGroups: await AuthGroupRepository.getMany({ userUuid: user.uuid }),
  }
  if (user.status === UserStatus.INVITED) {
    const expired = !(await UserResetPasswordRepository.hasValidResetPassword({ userUuid: user.uuid }))
    userUpdated = {
      ...userUpdated,
      invitation: {
        expired,
      },
    }
  }

  return userUpdated
}

export const get: UserService['get'] = async (options) => {
  const user = await UserRepository.get(options)
  if (user) return _initializeUser(user)
  return null
}
