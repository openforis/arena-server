import { UserRepository } from '../../repository'
import { UserService } from '@openforis/arena-core'

export const updateUserPrefs: UserService['updateUserPrefs'] = UserRepository.updateUserPrefs
