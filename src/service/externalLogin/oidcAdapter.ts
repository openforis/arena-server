import type * as OpenIdClient from 'openid-client' with { 'resolution-mode': 'import' }

// openid-client is ESM only: loaded with require (supported by Node.js 22) since this package is compiled to CommonJS
// eslint-disable-next-line @typescript-eslint/no-require-imports
const client: typeof OpenIdClient = require('openid-client')

import { AuthProviderType, AuthProviderWithSecret, ExternalIdentity } from '../../model'
import { NodeEnv, ProcessEnv } from '../../processEnv'
import { getIssuer } from '../authProvider/authProviderDefaults'

/**
 * Values generated when a sign-in starts and checked when the provider redirects back.
 */
export interface ExternalLoginFlowChecks {
  state: string
  nonce: string
  codeVerifier: string
}

/**
 * Turns a provider's sign-in into a normalized identity; one implementation per kind of provider.
 */
export interface AuthProviderAdapter {
  buildAuthorizationUrl(params: {
    provider: AuthProviderWithSecret
    redirectUri: string
    checks: ExternalLoginFlowChecks
  }): Promise<URL>
  handleCallback(params: {
    provider: AuthProviderWithSecret
    currentUrl: URL
    checks: ExternalLoginFlowChecks
  }): Promise<ExternalIdentity>
  testConnection(provider: AuthProviderWithSecret): Promise<{ issuer: string; keysCount: number; durationMs: number }>
}

// discovery results by provider, invalidated when the provider configuration changes
const configurationCache = new Map<string, { key: string; configuration: OpenIdClient.Configuration }>()

const getCacheKey = (provider: AuthProviderWithSecret): string =>
  JSON.stringify([getIssuer(provider.type, provider), provider.clientId, provider.clientSecret])

const isInsecureAllowed = (issuer: URL): boolean =>
  issuer.protocol === 'http:' && ProcessEnv.nodeEnv !== NodeEnv.production

const getConfiguration = async (provider: AuthProviderWithSecret): Promise<OpenIdClient.Configuration> => {
  const key = getCacheKey(provider)
  const cached = configurationCache.get(provider.id)
  if (cached?.key === key) return cached.configuration

  const issuer = new URL(getIssuer(provider.type, provider))
  const configuration = await client.discovery(
    issuer,
    provider.clientId,
    undefined,
    client.ClientSecretPost(provider.clientSecret),
    isInsecureAllowed(issuer) ? { execute: [client.allowInsecureRequests] } : undefined
  )
  configurationCache.set(provider.id, { key, configuration })
  return configuration
}

const isTrue = (value: unknown): boolean => value === true || value === 'true'

const toIdentity = (provider: AuthProviderWithSecret, claims: OpenIdClient.IDToken): ExternalIdentity => {
  const email = typeof claims.email === 'string' ? claims.email : undefined
  // Microsoft personal and work accounts may only have preferred_username (not verified)
  const fallbackEmail =
    provider.type === AuthProviderType.microsoft && typeof claims.preferred_username === 'string'
      ? claims.preferred_username
      : undefined
  return {
    issuer: claims.iss,
    subject: claims.sub,
    email: email ?? fallbackEmail,
    emailVerified: Boolean(email) && isTrue(claims.email_verified),
    name: typeof claims.name === 'string' ? claims.name : undefined,
  }
}

export const OidcAdapter: AuthProviderAdapter = {
  async buildAuthorizationUrl({ provider, redirectUri, checks }) {
    const configuration = await getConfiguration(provider)
    const parameters: Record<string, string> = {
      redirect_uri: redirectUri,
      scope: provider.scopes.join(' '),
      response_type: 'code',
      state: checks.state,
      nonce: checks.nonce,
      code_challenge: await client.calculatePKCECodeChallenge(checks.codeVerifier),
      code_challenge_method: 'S256',
    }
    if (provider.type === AuthProviderType.google || provider.type === AuthProviderType.microsoft) {
      // let users with more than one account choose which one to use
      parameters.prompt = 'select_account'
    }
    return client.buildAuthorizationUrl(configuration, parameters)
  },

  async handleCallback({ provider, currentUrl, checks }) {
    const configuration = await getConfiguration(provider)
    const tokens = await client.authorizationCodeGrant(configuration, currentUrl, {
      pkceCodeVerifier: checks.codeVerifier,
      expectedState: checks.state,
      expectedNonce: checks.nonce,
      idTokenExpected: true,
    })
    const claims = tokens.claims()
    if (!claims) throw new Error('ID token missing')
    return toIdentity(provider, claims)
  },

  async testConnection(provider) {
    const start = Date.now()
    configurationCache.delete(provider.id)
    const configuration = await getConfiguration(provider)
    const metadata = configuration.serverMetadata()
    let keysCount = 0
    if (metadata.jwks_uri) {
      const response = await fetch(metadata.jwks_uri)
      const jwks = (await response.json()) as { keys?: unknown[] }
      keysCount = jwks.keys?.length ?? 0
    }
    return { issuer: metadata.issuer, keysCount, durationMs: Date.now() - start }
  },
}

export const randomFlowChecks = (): ExternalLoginFlowChecks => ({
  state: client.randomState(),
  nonce: client.randomNonce(),
  codeVerifier: client.randomPKCECodeVerifier(),
})

/**
 * Adapter of a provider: only OpenID Connect for now (Google and Microsoft are presets of it).
 */
export const getAdapter = (_provider: AuthProviderWithSecret): AuthProviderAdapter => OidcAdapter
