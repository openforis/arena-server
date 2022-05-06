import { getPath } from './common'

export const auth = {
  login: (includeSurvey?: string): string => `${getPath('auth', 'login')}${includeSurvey ? '?includeSurvey=true' : ''}`,
}
