import fs from 'node:fs'

import { Logger } from '../../log'
import { AuthProviderSource, AuthProviderType, AuthProviderWithSecret } from '../../model'
import { ProcessEnv } from '../../processEnv'
import { withDefaults } from './authProviderDefaults'
import { validateAuthProvider } from './authProviderValidator'

const logger = new Logger('EnvAuthProviders')

export const getEnvClientSecretVariableName = (id: string): string =>
  `AUTH_PROVIDER_${id.toUpperCase().replaceAll('-', '_')}_CLIENT_SECRET`

const readConfig = (config: string): unknown => {
  const trimmed = config.trim()
  const json = trimmed.startsWith('[') ? trimmed : fs.readFileSync(trimmed, 'utf8')
  return JSON.parse(json)
}

const toProvider = (item: any, index: number): AuthProviderWithSecret | null => {
  const { id, type, clientSecret: _ignored, ...propsInput } = item ?? {}
  const props = withDefaults(type, { order: index, ...propsInput })
  const clientSecret = process.env[getEnvClientSecretVariableName(String(id))]
  const errors = validateAuthProvider({ id, type, props, secretRequired: true, clientSecret })
  if (Object.keys(errors).length > 0) {
    logger.error(`invalid provider "${id}" in AUTH_PROVIDERS_CONFIG: ${JSON.stringify(errors)}`)
    return null
  }
  return {
    ...props,
    id,
    type: type as AuthProviderType,
    source: AuthProviderSource.env,
    hasClientSecret: true,
    clientSecret,
  }
}

let cache: AuthProviderWithSecret[] | null = null

/**
 * Providers defined by the server configuration (AUTH_PROVIDERS_CONFIG), read once; invalid ones are skipped.
 */
export const getEnvAuthProviders = (): AuthProviderWithSecret[] => {
  if (cache) return cache
  const config = ProcessEnv.authProvidersConfig
  if (!config) {
    cache = []
    return cache
  }
  try {
    const items = readConfig(config)
    if (!Array.isArray(items)) throw new Error('an array of providers is expected')
    cache = items
      .map((item, index) => toProvider(item, index))
      .filter((provider): provider is AuthProviderWithSecret => provider !== null)
  } catch (error: any) {
    logger.error(`error reading AUTH_PROVIDERS_CONFIG: ${error.message}`)
    cache = []
  }
  return cache
}

// for tests
export const resetEnvAuthProvidersCache = (): void => {
  cache = null
}
