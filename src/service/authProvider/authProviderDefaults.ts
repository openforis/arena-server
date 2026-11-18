import { AuthProviderIconKind, AuthProviderProps, AuthProviderType } from '../../model'

export const defaultScopes = ['openid', 'email', 'profile']

const googleIssuer = 'https://accounts.google.com'
const microsoftDefaultTenant = 'common'

const defaultLabelByType: Record<AuthProviderType, string> = {
  [AuthProviderType.google]: 'Google',
  [AuthProviderType.microsoft]: 'Microsoft',
  [AuthProviderType.oidc]: '',
}

/**
 * Fills the missing props of a provider with the defaults of its type.
 */
export const withDefaults = (type: AuthProviderType, props: Partial<AuthProviderProps>): AuthProviderProps => {
  const isPreset = type !== AuthProviderType.oidc
  return {
    label: props.label || defaultLabelByType[type],
    enabled: props.enabled ?? true,
    showOnLoginPage: props.showOnLoginPage ?? true,
    order: props.order ?? 0,
    issuer: type === AuthProviderType.oidc ? props.issuer?.trim() : undefined,
    tenant: type === AuthProviderType.microsoft ? props.tenant?.trim() || microsoftDefaultTenant : undefined,
    clientId: props.clientId?.trim() ?? '',
    scopes: props.scopes?.length ? props.scopes : defaultScopes,
    allowedEmailDomains: (props.allowedEmailDomains ?? []).map((domain) => domain.trim().toLowerCase()).filter(Boolean),
    // Google always verifies emails
    trustEmail: type === AuthProviderType.google ? false : (props.trustEmail ?? false),
    requireArena2FA: props.requireArena2FA ?? true,
    // presets always use their official logo
    iconKind: isPreset ? AuthProviderIconKind.builtin : (props.iconKind ?? AuthProviderIconKind.generic),
  }
}

/**
 * Issuer identifier of a provider; for Microsoft it depends on the tenant (openid-client validates the actual
 * tenant issuer of multi-tenant endpoints).
 */
export const getIssuer = (type: AuthProviderType, props: AuthProviderProps): string => {
  if (type === AuthProviderType.google) return googleIssuer
  if (type === AuthProviderType.microsoft) {
    return `https://login.microsoftonline.com/${props.tenant ?? microsoftDefaultTenant}/v2.0`
  }
  return props.issuer ?? ''
}
