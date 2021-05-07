import { getApiPath } from './common'

export const survey = {
  create: (): string => getApiPath('survey', 'create'),
}
