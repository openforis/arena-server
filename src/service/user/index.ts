import { User, UserService } from '@openforis/arena-core'

import { get } from './get'

export const UserServiceServer: UserService = {
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  create(options: {
    user: User
    surveyId: number
    surveyCycleKey: string
    userToInviteParam: string
    urlServer: string
    repeatInvitation?: boolean
  }): Promise<Array<User>> {
    throw new Error('TODO')
  },

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  count(options: { user: User; surveyId: number }): Promise<number> {
    throw new Error('TODO')
  },

  get,

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getMany(options: { surveyId: number; limit?: number; offset?: number; user: User }): Promise<Array<User>> {
    throw new Error('TODO')
  },

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getProfilePicture(options: { userUuid: string }): Promise<string> {
    throw new Error('TODO')
  },

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(options: { user: User; surveyId: number; userToUpdate: User; filePath?: string }): Promise<User> {
    throw new Error('TODO')
  },

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  updateUserPrefs(options: { userToUpdate: User }): Promise<User> {
    throw new Error('TODO')
  },

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  delete(options: { surveyId: number; user: User; userUuid: string }): Promise<void> {
    throw new Error('TODO')
  },
}
