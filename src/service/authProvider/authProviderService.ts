import { ArenaService } from '@openforis/arena-core'

import { BaseProtocol, DB } from '../../db'
import { Logger } from '../../log'
import {
  AuthProvider,
  AuthProviderForLogin,
  AuthProviderProps,
  AuthProviderSource,
  AuthProviderType,
  AuthProviderWithSecret,
  UserExternalIdentity,
} from '../../model'
import { ProcessEnv } from '../../processEnv'
import {
  AuthProviderRepository,
  AuthProviderRow,
  UserExternalIdentityRepository,
  UserRepository,
} from '../../repository'
import { ServerError, ServerErrorCode } from '../../server/error'
import { getIssuer, withDefaults } from './authProviderDefaults'
import { AuthProviderValidationErrors, validateAuthProvider } from './authProviderValidator'
import { getEnvAuthProviders } from './envAuthProviders'
import { decryptSecret, encryptSecret, isSecretEncryptionAvailable } from './secretBox'

// changes made by other cluster instances are picked up within this time
const cacheTtlMs = 60 * 1000

const allowedIconMimes = new Set(['image/png', 'image/svg+xml'])
const maxIconSizeBytes = 100 * 1024

export const AuthProviderErrorKeys = {
  notFound: 'appErrors.authProvider.notFound',
  readOnly: 'appErrors.authProvider.readOnly',
  idAlreadyUsed: 'appErrors.authProvider.idAlreadyUsed',
  encryptionKeyMissing: 'appErrors.authProvider.encryptionKeyMissing',
  validation: 'appErrors.authProvider.validation',
  iconInvalid: 'appErrors.authProvider.iconInvalid',
  identityNotFound: 'appErrors.authProvider.identityNotFound',
  lastSignInMethod: 'appErrors.authProvider.lastSignInMethod',
}

export interface AuthProviderInput {
  id: string
  type: AuthProviderType
  props: Partial<AuthProviderProps>
  // undefined: keep the current one
  clientSecret?: string
}

let cache: { providers: AuthProviderWithSecret[]; expiresAt: number } | null = null

const invalidateCache = (): void => {
  cache = null
}

const logger = new Logger('AuthProviderService')

// a secret that cannot be decrypted (key missing or changed) disables the provider instead of failing all of them
const decryptSecretSafe = (row: AuthProviderRow): string | undefined => {
  if (!row.clientSecret || !isSecretEncryptionAvailable()) return undefined
  try {
    return decryptSecret(row.clientSecret)
  } catch {
    logger.error(`cannot decrypt the client secret of auth provider "${row.id}"`)
    return undefined
  }
}

const fromRow = (row: AuthProviderRow): AuthProviderWithSecret => {
  const props = withDefaults(row.type, row.props)
  return {
    ...props,
    id: row.id,
    type: row.type,
    source: AuthProviderSource.db,
    hasClientSecret: Boolean(row.clientSecret),
    clientSecret: decryptSecretSafe(row),
    iconMime: row.iconMime ?? undefined,
    dateCreated: row.dateCreated,
    dateModified: row.dateModified,
  }
}

const loadAll = async (): Promise<AuthProviderWithSecret[]> => {
  const now = Date.now()
  if (cache && cache.expiresAt > now) return cache.providers
  const rows = await AuthProviderRepository.getAll()
  const providers = [...getEnvAuthProviders(), ...rows.map(fromRow)].sort((a, b) => a.order - b.order)
  cache = { providers, expiresAt: now + cacheTtlMs }
  return providers
}

const withoutSecret = (provider: AuthProviderWithSecret): AuthProvider => {
  const { clientSecret: _secret, ...rest } = provider
  return rest
}

const getAll = async (): Promise<AuthProvider[]> => (await loadAll()).map(withoutSecret)

const getWithSecret = async (id: string): Promise<AuthProviderWithSecret | null> =>
  (await loadAll()).find((provider) => provider.id === id) ?? null

const get = async (id: string): Promise<AuthProvider | null> => {
  const provider = await getWithSecret(id)
  return provider ? withoutSecret(provider) : null
}

const getForLogin = async (): Promise<AuthProviderForLogin[]> =>
  (await loadAll())
    .filter((provider) => provider.enabled && provider.showOnLoginPage && Boolean(provider.clientSecret))
    .map(({ id, type, label, iconKind }) => ({ id, type, label, iconKind }))

const getRedirectUri = (id: string, baseUrl: string = ProcessEnv.arenaPublicUrl): string =>
  `${baseUrl}/auth/oidc/${id}/callback`

const throwIfInvalid = (errors: AuthProviderValidationErrors): void => {
  if (Object.keys(errors).length > 0) {
    throw new ServerError(AuthProviderErrorKeys.validation, { errors }, ServerErrorCode.BAD_REQUEST)
  }
}

const getDbProviderOrThrow = async (id: string, client: BaseProtocol): Promise<AuthProviderRow> => {
  if (getEnvAuthProviders().some((provider) => provider.id === id)) {
    throw new ServerError(AuthProviderErrorKeys.readOnly, { id }, ServerErrorCode.FORBIDDEN)
  }
  const row = await AuthProviderRepository.getById(id, client)
  if (!row) throw new ServerError(AuthProviderErrorKeys.notFound, { id }, ServerErrorCode.NOT_FOUND)
  return row
}

const encryptIfDefined = (clientSecret: string | undefined): string | undefined => {
  if (clientSecret === undefined) return undefined
  if (!isSecretEncryptionAvailable()) {
    throw new ServerError(AuthProviderErrorKeys.encryptionKeyMissing, {}, ServerErrorCode.BAD_REQUEST)
  }
  return encryptSecret(clientSecret)
}

const create = async (input: AuthProviderInput, client: BaseProtocol = DB): Promise<AuthProvider> => {
  const { id, type, clientSecret } = input
  const existing = await loadAll()
  const props = withDefaults(type, { order: existing.length, ...input.props })
  throwIfInvalid(validateAuthProvider({ id, type, props, secretRequired: true, clientSecret }))
  if (existing.some((provider) => provider.id === id) || (await AuthProviderRepository.getById(id, client))) {
    throw new ServerError(AuthProviderErrorKeys.idAlreadyUsed, { id }, ServerErrorCode.CONFLICT)
  }
  const row = await AuthProviderRepository.insert(
    { id, type, props, clientSecret: encryptIfDefined(clientSecret) },
    client
  )
  invalidateCache()
  return withoutSecret(fromRow(row))
}

const update = async (
  params: { id: string; props: Partial<AuthProviderProps>; clientSecret?: string },
  client: BaseProtocol = DB
): Promise<AuthProvider> => {
  const { id, clientSecret } = params
  const row = await getDbProviderOrThrow(id, client)
  const props = withDefaults(row.type, { ...row.props, ...params.props })
  throwIfInvalid(validateAuthProvider({ id, type: row.type, props, secretRequired: false }))
  const updated = await AuthProviderRepository.update(
    { id, props, clientSecret: encryptIfDefined(clientSecret || undefined) },
    client
  )
  invalidateCache()
  return withoutSecret(fromRow(updated!))
}

/**
 * Deletes a provider and the identity links of its users.
 */
const deleteItem = (id: string, client: BaseProtocol = DB): Promise<{ deletedIdentities: number }> =>
  client.tx(async (tx) => {
    await getDbProviderOrThrow(id, tx)
    const deletedIdentities = await UserExternalIdentityRepository.deleteByProviderId(id, tx)
    await AuthProviderRepository.deleteById(id, tx)
    invalidateCache()
    return { deletedIdentities }
  })

/**
 * Sets the order of the DB providers to the position of their ids in the given list (env providers keep theirs).
 */
const reorder = async (ids: string[], client: BaseProtocol = DB): Promise<void> => {
  const dbIds = new Set((await AuthProviderRepository.getAll(client)).map((row) => row.id))
  const orderById = Object.fromEntries(ids.map((id, index) => [id, index]).filter(([id]) => dbIds.has(id as string)))
  await AuthProviderRepository.updateOrders(orderById, client)
  invalidateCache()
}

const setIcon = async (
  params: { id: string; file: Buffer | null; mime: string | null },
  client: BaseProtocol = DB
): Promise<void> => {
  const { id, file, mime } = params
  await getDbProviderOrThrow(id, client)
  if (file && (!mime || !allowedIconMimes.has(mime) || file.length > maxIconSizeBytes)) {
    throw new ServerError(AuthProviderErrorKeys.iconInvalid, { maxIconSizeBytes }, ServerErrorCode.BAD_REQUEST)
  }
  await AuthProviderRepository.setIcon({ id, file, mime: file ? mime : null }, client)
  invalidateCache()
}

const getIcon = (id: string): Promise<{ file: Buffer; mime: string } | null> => AuthProviderRepository.getIcon(id)

const getLinkedUsersCountByProvider = (): Promise<Record<string, number>> =>
  UserExternalIdentityRepository.countByProvider()

const getUsersWithoutOtherSignInMethod = (id: string) =>
  UserExternalIdentityRepository.getUsersWithoutOtherSignInMethod(id)

const getUserIdentities = (userUuid: string): Promise<UserExternalIdentity[]> =>
  UserExternalIdentityRepository.getByUserUuid(userUuid)

/**
 * Removes an identity link of a user; refused if it is the user's last sign-in method (no password, no other link),
 * unless allowLastMethod is true (system admin confirmation).
 */
const unlinkUserIdentity = (
  params: { userUuid: string; identityId: string; allowLastMethod?: boolean },
  client: BaseProtocol = DB
): Promise<UserExternalIdentity> =>
  client.tx(async (tx) => {
    const { userUuid, identityId, allowLastMethod = false } = params
    const identity = await UserExternalIdentityRepository.getById(identityId, tx)
    if (identity?.userUuid !== userUuid) {
      throw new ServerError(AuthProviderErrorKeys.identityNotFound, { identityId }, ServerErrorCode.NOT_FOUND)
    }
    const user = await UserRepository.getForExternalLogin(userUuid, tx)
    const identities = await UserExternalIdentityRepository.getByUserUuid(userUuid, tx)
    if (!allowLastMethod && !user?.hasPassword && identities.length <= 1) {
      throw new ServerError(AuthProviderErrorKeys.lastSignInMethod, {}, ServerErrorCode.CONFLICT)
    }
    await UserExternalIdentityRepository.deleteById(identityId, tx)
    return identity
  })

export interface AuthProviderService extends ArenaService {
  getAll(): Promise<AuthProvider[]>
  get(id: string): Promise<AuthProvider | null>
  getWithSecret(id: string): Promise<AuthProviderWithSecret | null>
  getForLogin(): Promise<AuthProviderForLogin[]>
  getIssuer(provider: AuthProvider): string
  getRedirectUri(id: string, baseUrl?: string): string
  isSecretEncryptionAvailable(): boolean
  create(input: AuthProviderInput, client?: BaseProtocol): Promise<AuthProvider>
  update(
    params: { id: string; props: Partial<AuthProviderProps>; clientSecret?: string },
    client?: BaseProtocol
  ): Promise<AuthProvider>
  deleteItem(id: string, client?: BaseProtocol): Promise<{ deletedIdentities: number }>
  reorder(ids: string[], client?: BaseProtocol): Promise<void>
  setIcon(params: { id: string; file: Buffer | null; mime: string | null }, client?: BaseProtocol): Promise<void>
  getIcon(id: string): Promise<{ file: Buffer; mime: string } | null>
  getLinkedUsersCountByProvider(): Promise<Record<string, number>>
  getUsersWithoutOtherSignInMethod(id: string): Promise<{ uuid: string; name: string | null; email: string }[]>
  getUserIdentities(userUuid: string): Promise<UserExternalIdentity[]>
  unlinkUserIdentity(
    params: { userUuid: string; identityId: string; allowLastMethod?: boolean },
    client?: BaseProtocol
  ): Promise<UserExternalIdentity>
  invalidateCache(): void
}

export const AuthProviderServiceServer: AuthProviderService = {
  getAll,
  get,
  getWithSecret,
  getForLogin,
  getIssuer: (provider: AuthProvider) => getIssuer(provider.type, provider),
  getRedirectUri,
  isSecretEncryptionAvailable,
  create,
  update,
  deleteItem,
  reorder,
  setIcon,
  getIcon,
  getLinkedUsersCountByProvider,
  getUsersWithoutOtherSignInMethod,
  getUserIdentities,
  unlinkUserIdentity,
  invalidateCache,
}
