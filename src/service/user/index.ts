import { ArenaUser, ArenaUserService } from '@openforis/arena-core'

import { get } from './get'
import { updateUserPrefs } from './updateUserPrefs'

export const UserServiceServer: ArenaUserService = {
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  create(options: {
    user: ArenaUser
    surveyId: number
    surveyCycleKey: string
    userToInviteParam: string
    urlServer: string
    repeatInvitation?: boolean
  }): Promise<Array<ArenaUser>> {
    throw new Error('TODO')
  },

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  count(options: { user: ArenaUser; surveyId: number }): Promise<number> {
    throw new Error('TODO')
  },

  get,

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getMany(options: { surveyId: number; limit?: number; offset?: number; user: ArenaUser }): Promise<Array<ArenaUser>> {
    throw new Error('TODO')
  },

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getProfilePicture(options: { userUuid: string }): Promise<string> {
    throw new Error('TODO')
  },

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(options: {
    user: ArenaUser
    surveyId: number
    userToUpdate: ArenaUser
    filePath?: string
  }): Promise<ArenaUser> {
    throw new Error('TODO')
  },

  updateUserPrefs,

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  delete(options: { surveyId: number; user: ArenaUser; userUuid: string }): Promise<void> {
    throw new Error('TODO')
  },
}
