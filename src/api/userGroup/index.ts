import { Express } from 'express'

import { ExpressInitializer } from '../../server'
import { UserGroupCreate } from './create'
import { UserGroupRead } from './read'
import { UserGroupUpdate } from './update'
import { UserGroupDelete } from './delete'

export const UserGroupApi: ExpressInitializer = {
  init: (express: Express): void => {
    UserGroupCreate.init(express)
    UserGroupRead.init(express)
    UserGroupUpdate.init(express)
    UserGroupDelete.init(express)
  },
}
