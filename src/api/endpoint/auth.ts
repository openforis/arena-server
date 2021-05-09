import { getApiPath } from './common'

export const auth = {
  login: (includeSurvey?: string): string =>
    `${getApiPath('auth', 'login')}${includeSurvey ? '?includeSurvey=true' : ''}`,
}
