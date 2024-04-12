import { ArenaService } from '@openforis/arena-core'
import { BaseProtocol } from '../db'

export interface SurveyItemService<T> extends ArenaService {
  count(params: { surveyId: number }, client?: BaseProtocol): Promise<number>

  getAll(params: { surveyId: number }, client?: BaseProtocol): Promise<T[]>

  getByUuid(params: { surveyId: number; uuid: string }, client?: BaseProtocol): Promise<T>

  insert(params: { surveyId: number; item: T }, client?: BaseProtocol): Promise<T>

  update(params: { surveyId: number; item: T }, client?: BaseProtocol): Promise<T>

  deleteItem(params: { surveyId: number; uuid: string }, client?: BaseProtocol): Promise<T | null>
}
