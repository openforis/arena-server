import { getPath } from './common'

export const auth = {
  login: ({ includeSurvey }: { includeSurvey?: boolean } = {}): string =>
    `${getPath('auth', 'login')}${includeSurvey ? '?includeSurvey=true' : ''}`,
  tokenRefresh: (): string => getPath('auth', 'token', 'refresh'),
}
