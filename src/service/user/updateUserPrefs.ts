import { AuthGroupRepository, UserRepository } from '../../repository'
import { User, UserService } from '@openforis/arena-core'
import { BaseProtocol, DB } from '../../db'

export const updateUserPrefs: UserService['updateUserPrefs'] = async (
  options: {
    userToUpdate: User
  },
  client: BaseProtocol = DB
): Promise<User> => {
  const { userToUpdate } = options
  const user = await UserRepository.updateUserPrefs({ userToUpdate }, client)
  return {
    ...user,
    authGroups: await AuthGroupRepository.getMany({ userUuid: user.uuid }, client),
  }
}
