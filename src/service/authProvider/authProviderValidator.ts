import { AuthProviderProps, AuthProviderType } from '../../model'
import { NodeEnv, ProcessEnv } from '../../processEnv'

export type AuthProviderValidationErrors = Partial<
  Record<keyof AuthProviderProps | 'id' | 'type' | 'clientSecret', string>
>

const idRegExp = /^[a-z0-9][a-z0-9-]{0,62}$/
const tenantRegExp = /^[\w.-]{1,100}$/
const domainRegExp = /^[a-z0-9-]{1,63}(\.[a-z0-9-]{1,63})+$/
const maxLabelLength = 64

const errorKeyPrefix = 'appErrors.authProvider'

const isValidIssuer = (issuer: string | undefined): boolean => {
  if (!issuer) return false
  try {
    const url = new URL(issuer)
    // plain http only for local test providers
    return url.protocol === 'https:' || (url.protocol === 'http:' && ProcessEnv.nodeEnv !== NodeEnv.production)
  } catch {
    return false
  }
}

const validateConnection = (type: AuthProviderType, props: AuthProviderProps, errors: AuthProviderValidationErrors) => {
  if (type === AuthProviderType.oidc && !isValidIssuer(props.issuer)) {
    errors.issuer = `${errorKeyPrefix}.issuerInvalid`
  }
  if (type === AuthProviderType.microsoft && !tenantRegExp.test(props.tenant ?? '')) {
    errors.tenant = `${errorKeyPrefix}.tenantInvalid`
  }
  if (!props.clientId) {
    errors.clientId = `${errorKeyPrefix}.clientIdRequired`
  }
  if (!props.scopes.includes('openid')) {
    errors.scopes = `${errorKeyPrefix}.scopesMissingOpenid`
  }
}

/**
 * Validates a provider; returns the error keys by field (empty object if valid).
 */
export const validateAuthProvider = (params: {
  id: string
  type: AuthProviderType
  props: AuthProviderProps
  secretRequired: boolean
  clientSecret?: string
}): AuthProviderValidationErrors => {
  const { id, type, props, secretRequired, clientSecret } = params
  const errors: AuthProviderValidationErrors = {}
  if (!idRegExp.test(id)) {
    errors.id = `${errorKeyPrefix}.idInvalid`
  }
  if (!Object.values(AuthProviderType).includes(type)) {
    errors.type = `${errorKeyPrefix}.typeInvalid`
  }
  if (!props.label || props.label.length > maxLabelLength) {
    errors.label = `${errorKeyPrefix}.labelInvalid`
  }
  validateConnection(type, props, errors)
  if (props.allowedEmailDomains.some((domain) => !domainRegExp.test(domain))) {
    errors.allowedEmailDomains = `${errorKeyPrefix}.emailDomainInvalid`
  }
  if (secretRequired && !clientSecret) {
    errors.clientSecret = `${errorKeyPrefix}.clientSecretRequired`
  }
  return errors
}
