import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { AuthProviderIconKind, AuthProviderSource, AuthProviderType } from '../../../model'
import { ProcessEnv } from '../../../processEnv'
import { UserRepository } from '../../../repository'
import { getIssuer, withDefaults } from '../authProviderDefaults'
import { validateAuthProvider } from '../authProviderValidator'
import { getEnvAuthProviders, getEnvClientSecretVariableName, resetEnvAuthProvidersCache } from '../envAuthProviders'
import { decryptSecret, encryptSecret } from '../secretBox'

describe('normalizeEmail', () => {
  test.each([
    ['John.Doe@Example.org', 'john.doe@example.org'],
    ['John.Doe+arena@gmail.com', 'johndoe@gmail.com'],
    ['j.o.h.n.doe@googlemail.com', 'johndoe@gmail.com'],
    ['john+x.y@GMAIL.COM', 'john@gmail.com'],
  ])('%s -> %s', (email, expected) => {
    expect(UserRepository.normalizeEmail(email)).toBe(expected)
  })
})

describe('auth provider defaults and validation', () => {
  test('presets have a fixed issuer and the official icon', () => {
    const props = withDefaults(AuthProviderType.microsoft, { clientId: 'id', iconKind: AuthProviderIconKind.generic })
    expect(props.iconKind).toBe(AuthProviderIconKind.builtin)
    expect(props.label).toBe('Microsoft')
    expect(getIssuer(AuthProviderType.microsoft, props)).toBe('https://login.microsoftonline.com/common/v2.0')
    expect(getIssuer(AuthProviderType.google, props)).toBe('https://accounts.google.com')
  })

  test('valid generic provider', () => {
    const props = withDefaults(AuthProviderType.oidc, {
      label: 'SSO',
      issuer: 'https://sso.example.org/realms/main',
      clientId: 'arena',
      allowedEmailDomains: ['Example.org '],
    })
    expect(props.allowedEmailDomains).toEqual(['example.org'])
    const errors = validateAuthProvider({
      id: 'sso',
      type: AuthProviderType.oidc,
      props,
      secretRequired: true,
      clientSecret: 's',
    })
    expect(errors).toEqual({})
  })

  test('invalid fields', () => {
    const props = withDefaults(AuthProviderType.oidc, {
      issuer: 'not a url',
      scopes: ['email'],
      allowedEmailDomains: ['not a domain'],
    })
    const errors = validateAuthProvider({ id: '_2fa', type: AuthProviderType.oidc, props, secretRequired: true })
    expect(Object.keys(errors).sort()).toEqual(
      ['allowedEmailDomains', 'clientId', 'clientSecret', 'id', 'issuer', 'label', 'scopes'].sort()
    )
  })
})

describe('client secret encryption', () => {
  const originalKey = ProcessEnv.authProviderSecretEncryptionKey

  afterAll(() => {
    ProcessEnv.authProviderSecretEncryptionKey = originalKey
  })

  test('round trip', () => {
    ProcessEnv.authProviderSecretEncryptionKey = 'b'.repeat(64)
    const encrypted = encryptSecret('my secret')
    expect(encrypted.startsWith('v1:')).toBe(true)
    expect(encrypted).not.toContain('my secret')
    expect(decryptSecret(encrypted)).toBe('my secret')
  })

  test('fails without a valid key', () => {
    ProcessEnv.authProviderSecretEncryptionKey = 'short'
    expect(() => encryptSecret('my secret')).toThrow('AUTH_PROVIDER_SECRET_ENCRYPTION_KEY')
  })
})

describe('providers from AUTH_PROVIDERS_CONFIG', () => {
  const originalConfig = ProcessEnv.authProvidersConfig
  const secretVariable = getEnvClientSecretVariableName('fao-sso')

  afterEach(() => {
    ProcessEnv.authProvidersConfig = originalConfig
    delete process.env[secretVariable]
    resetEnvAuthProvidersCache()
  })

  test('reads a JSON file and the secrets from the environment, skipping invalid providers', () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'auth-providers-')), 'providers.json')
    fs.writeFileSync(
      file,
      JSON.stringify([
        { id: 'fao-sso', type: 'oidc', label: 'FAO SSO', issuer: 'https://sso.example.org', clientId: 'arena' },
        // no client secret variable: skipped
        { id: 'other', type: 'google', clientId: 'arena' },
      ])
    )
    ProcessEnv.authProvidersConfig = file
    process.env[secretVariable] = 'env-secret'
    expect(secretVariable).toBe('AUTH_PROVIDER_FAO_SSO_CLIENT_SECRET')

    const providers = getEnvAuthProviders()
    expect(providers).toHaveLength(1)
    expect(providers[0]).toMatchObject({
      id: 'fao-sso',
      source: AuthProviderSource.env,
      clientSecret: 'env-secret',
      requireArena2FA: true,
    })
  })

  test('accepts inline JSON and ignores invalid JSON', () => {
    ProcessEnv.authProvidersConfig = '[not json'
    expect(getEnvAuthProviders()).toEqual([])
  })
})
