import { getPath } from './common'

export const auth = {
  login: ({ includeSurvey }: { includeSurvey?: boolean } = {}): string =>
    `${getPath('auth', 'login')}${includeSurvey ? '?includeSurvey=true' : ''}`,
  loginTempAuthToken: (): string => getPath('auth', 'login', 'temp-auth-token'),
  tokenRefresh: (): string => getPath('auth', 'token', 'refresh'),
}
