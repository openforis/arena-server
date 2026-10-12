import { ArenaRecord, RecordService, User } from '@openforis/arena-core'

import { get, getManyByUuids } from './get'

export const RecordServiceServer: RecordService = {
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  create(options: { socketId: string; record: ArenaRecord; surveyId: number; user: User }): Promise<ArenaRecord> {
    throw new Error('TODO')
  },

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  count(options: { cycle: string; surveyId: number }): Promise<number> {
    throw new Error('TODO')
  },

  get,

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getMany(options: { cycle: string; limit: number; offset: number; surveyId: number }): Promise<ArenaRecord[]> {
    throw new Error('TODO')
  },

  getManyByUuids,

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(options: { recordUuid: string; step: string; surveyId: number; user: User }): Promise<ArenaRecord> {
    throw new Error('TODO')
  },

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  checkIn(options: {
    draft?: boolean
    recordUuid: string
    socketId: string
    surveyId: number
    user: User
  }): Promise<ArenaRecord> {
    throw new Error('TODO')
  },

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  checkOut(options: { recordUuid: string; socketId: string; surveyId: number; user: User }): void {
    throw new Error('TODO')
  },

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  delete(options: { recordUuid: string; socketId: string; surveyId: number; user: User }): void {
    throw new Error('TODO')
  },
}
