import { UserService } from '@openforis/arena-core'

import { UserRepository } from '../../repository'

export const get: UserService['get'] = UserRepository.get
