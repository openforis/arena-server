import { Record, RecordService } from '@openforis/arena-core'

import { User } from '@openforis/arena-core'

import { get } from './get'

export const RecordServiceServer: RecordService = {
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  create(options: { socketId: string; record: Record; surveyId: number; user: User }): Promise<Record> {
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
  getMany(options: { cycle: string; limit: number; offset: number; surveyId: number }): Promise<Record[]> {
    throw new Error('TODO')
  },

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(options: { recordUuid: string; step: string; surveyId: number; user: User }): Promise<Record> {
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
  }): Promise<Record> {
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
