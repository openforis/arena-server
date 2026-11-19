import { getPath } from './common'

export const auth = {
  login: ({ includeSurvey }: { includeSurvey?: boolean } = {}): string =>
    `${getPath('auth', 'login')}${includeSurvey ? '?includeSurvey=true' : ''}`,
  loginTemp: (): string => getPath('auth', 'login', 'temp'),
  tempAuthToken: (): string => getPath('auth', 'token', 'temp'),
  tokenRefresh: (): string => getPath('auth', 'token', 'refresh'),
  // external login providers
  externalLoginProviders: (): string => getPath('auth', 'providers'),
  externalLoginProviderIcon: (providerId: string): string => getPath('auth', 'providers', providerId, 'icon'),
  externalLoginStart: (providerId: string): string => getPath('auth', 'oidc', providerId),
  externalLoginCallback: (providerId: string): string => getPath('auth', 'oidc', providerId, 'callback'),
  externalLoginTicket: (providerId: string): string => getPath('auth', 'oidc', providerId, 'ticket'),
  // ids start with a letter or digit, so these cannot clash with a provider id
  externalLoginTwoFactor: (): string => getPath('auth', 'oidc', '_2fa'),
  externalLoginTestResult: (): string => getPath('auth', 'oidc', '_test-result'),
  externalLoginMobileToken: (): string => getPath('auth', 'oidc', '_mobile-token'),
}
