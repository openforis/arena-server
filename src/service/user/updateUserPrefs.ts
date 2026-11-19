import { AuthGroupRepository, UserRepository } from '../../repository'
import { ArenaUser, ArenaUserService } from '@openforis/arena-core'

export const updateUserPrefs: ArenaUserService['updateUserPrefs'] = async (options: {
  userToUpdate: ArenaUser
}): Promise<ArenaUser> => {
  const { userToUpdate } = options
  const user = await UserRepository.updateUserPrefs({ userToUpdate })
  return {
    ...user,
    authGroups: await AuthGroupRepository.getMany({ userUuid: user.uuid }),
  }
}
