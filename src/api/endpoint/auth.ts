import { getPath } from './common'

export const auth = {
  login: ({ includeSurvey }: { includeSurvey?: boolean } = {}): string =>
    `${getPath('auth', 'login')}${includeSurvey ? '?includeSurvey=true' : ''}`,
  loginTemp: (): string => getPath('auth', 'login', 'temp'),
  tempAuthToken: (): string => getPath('auth', 'token', 'temp'),
  tokenRefresh: (): string => getPath('auth', 'token', 'refresh'),
}
