import { AuthGroupRepository, UserRepository } from '../../repository'
import { User, UserService } from '@openforis/arena-core'

export const updateUserPrefs: UserService['updateUserPrefs'] = async (options: {
  userToUpdate: User
}): Promise<User> => {
  const { userToUpdate } = options
  const user = await UserRepository.updateUserPrefs({ userToUpdate })
  return {
    ...user,
    authGroups: await AuthGroupRepository.getMany({ userUuid: user.uuid }),
  }
}
