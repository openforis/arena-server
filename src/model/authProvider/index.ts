export enum AuthProviderType {
  oidc = 'oidc',
  google = 'google',
  microsoft = 'microsoft',
}

export enum AuthProviderSource {
  db = 'db',
  env = 'env',
}

export enum AuthProviderIconKind {
  builtin = 'builtin',
  uploaded = 'uploaded',
  generic = 'generic',
}

/**
 * Editable settings of an external login provider.
 */
export interface AuthProviderProps {
  label: string
  enabled: boolean
  showOnLoginPage: boolean
  order: number
  // generic OIDC only: preset types know their issuer
  issuer?: string
  // Microsoft only: tenant id, or "common" / "organizations" / "consumers"
  tenant?: string
  clientId: string
  scopes: string[]
  // empty = any domain
  allowedEmailDomains: string[]
  // link by email even if the provider does not report email_verified
  trustEmail: boolean
  // users with Arena 2FA enabled must still enter their code
  requireArena2FA: boolean
  iconKind: AuthProviderIconKind
}

export interface AuthProvider extends AuthProviderProps {
  // stable slug, immutable: used in URLs and identity links
  id: string
  type: AuthProviderType
  source: AuthProviderSource
  hasClientSecret: boolean
  iconMime?: string
  dateCreated?: Date
  dateModified?: Date
}

export interface AuthProviderWithSecret extends AuthProvider {
  clientSecret?: string
}

/**
 * Provider as shown on the login page (public).
 */
export interface AuthProviderForLogin {
  id: string
  type: AuthProviderType
  label: string
  iconKind: AuthProviderIconKind
  // sign-in available in Arena Mobile (not sent by servers released before the mobile flow)
  mobileLogin?: boolean
}

/**
 * Normalized identity returned by a provider adapter after a successful sign-in.
 */
export interface ExternalIdentity {
  issuer: string
  subject: string
  email?: string
  emailVerified: boolean
  name?: string
}

export interface UserExternalIdentity {
  id: string
  userUuid: string
  providerId: string
  issuer: string
  subject: string
  email?: string
  dateCreated: Date
  dateLastUsed?: Date
}
