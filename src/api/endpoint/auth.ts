import { getApiPath } from './common'

export const auth = {
  login: (): string => getApiPath('auth', 'login'),
}
