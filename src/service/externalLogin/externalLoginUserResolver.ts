import { UserStatus } from '@openforis/arena-core'

import { BaseProtocol, DB } from '../../db'
import { AuthProvider, ExternalIdentity, UserExternalIdentity } from '../../model'
import { UserExternalIdentityRepository, UserForExternalLogin, UserRepository } from '../../repository'

export const ExternalLoginErrorKeys = {
  providerNotAvailable: 'externalLogin.providerNotAvailable',
  flowInvalid: 'externalLogin.flowInvalid',
  providerError: 'externalLogin.providerError',
  emailNotVerified: 'externalLogin.emailNotVerified',
  emailDomainNotAllowed: 'externalLogin.emailDomainNotAllowed',
  userNotFound: 'externalLogin.userNotFound',
  ambiguousEmail: 'externalLogin.ambiguousEmail',
  identityAlreadyLinked: 'externalLogin.identityAlreadyLinked',
  providerAlreadyLinked: 'externalLogin.providerAlreadyLinked',
  invitationInvalid: 'externalLogin.invitationInvalid',
  invalidTwoFactorCode: 'externalLogin.invalidTwoFactorCode',
}

export type ExternalLoginResolution = { userUuid: string; linked: boolean; accepted: boolean } | { errorKey: string }

type ResolveParams = {
  provider: AuthProvider
  identity: ExternalIdentity
  // dry run (admin test sign-in): nothing is written
  dryRun?: boolean
}

const error = (errorKey: string): ExternalLoginResolution => ({ errorKey })

const getEmailDomain = (email: string | undefined): string | undefined =>
  email ? email.substring(email.lastIndexOf('@') + 1).toLowerCase() : undefined

export const isEmailDomainAllowed = (provider: AuthProvider, identity: ExternalIdentity): boolean => {
  const { allowedEmailDomains } = provider
  if (allowedEmailDomains.length === 0) return true
  const domain = getEmailDomain(identity.email)
  return Boolean(domain) && allowedEmailDomains.includes(domain!)
}

const linkIdentity = async (
  params: ResolveParams & { userUuid: string },
  client: BaseProtocol
): Promise<string | null> => {
  const { provider, identity, userUuid, dryRun } = params
  const linkedToProvider = await UserExternalIdentityRepository.getByUserUuidAndProviderId(
    { userUuid, providerId: provider.id },
    client
  )
  // another account of the same provider is already linked to this user
  if (linkedToProvider) return ExternalLoginErrorKeys.providerAlreadyLinked
  if (!dryRun) {
    const { issuer, subject, email } = identity
    await UserExternalIdentityRepository.insert({ userUuid, providerId: provider.id, issuer, subject, email }, client)
  }
  return null
}

const acceptInvitationIfNeeded = async (
  params: { user: UserForExternalLogin; name?: string; dryRun?: boolean },
  client: BaseProtocol
): Promise<boolean> => {
  const { user, name, dryRun } = params
  if (user.status !== UserStatus.INVITED) return false
  if (!dryRun) {
    await UserRepository.acceptInvitationExternal({ userUuid: user.uuid, name }, client)
  }
  return true
}

const resolveLinked = async (
  params: ResolveParams & { existing: UserExternalIdentity },
  client: BaseProtocol
): Promise<ExternalLoginResolution> => {
  const { existing, identity, dryRun } = params
  const user = await UserRepository.getForExternalLogin(existing.userUuid, client)
  if (!user) return error(ExternalLoginErrorKeys.userNotFound)
  const accepted = await acceptInvitationIfNeeded({ user, name: identity.name, dryRun }, client)
  if (!dryRun) {
    await UserExternalIdentityRepository.touch({ id: existing.id, email: identity.email }, client)
  }
  return { userUuid: user.uuid, linked: false, accepted }
}

const findUserByEmail = async (params: ResolveParams, client: BaseProtocol): Promise<UserForExternalLogin | string> => {
  const { provider, identity } = params
  if (!identity.email || !(identity.emailVerified || provider.trustEmail)) {
    return ExternalLoginErrorKeys.emailNotVerified
  }
  const users = await UserRepository.findByNormalizedEmail(identity.email, client)
  if (users.length === 0) return ExternalLoginErrorKeys.userNotFound
  if (users.length > 1) return ExternalLoginErrorKeys.ambiguousEmail
  return users[0]
}

/**
 * Login mode: already linked identity, or first sign-in matched by verified email.
 */
const resolveLogin = async (params: ResolveParams, client: BaseProtocol): Promise<ExternalLoginResolution> => {
  const { provider, identity, dryRun } = params
  // checked for linked identities too, so that restricting the domains applies to every user
  if (!isEmailDomainAllowed(provider, identity)) return error(ExternalLoginErrorKeys.emailDomainNotAllowed)
  const existing = await UserExternalIdentityRepository.getByIssuerAndSubject(identity, client)
  if (existing) return resolveLinked({ ...params, existing }, client)

  const userOrError = await findUserByEmail(params, client)
  if (typeof userOrError === 'string') return error(userOrError)

  const user = userOrError
  const linkError = await linkIdentity({ ...params, userUuid: user.uuid }, client)
  if (linkError) return error(linkError)
  const accepted = await acceptInvitationIfNeeded({ user, name: identity.name, dryRun }, client)
  return { userUuid: user.uuid, linked: true, accepted }
}

/**
 * Invitation mode: the invitation link proves the ownership of the invited email, so the provider email may differ.
 */
const resolveInvitation = async (
  params: ResolveParams & { invitationUuid: string; name?: string },
  client: BaseProtocol
): Promise<ExternalLoginResolution> => {
  const { provider, identity, invitationUuid, name, dryRun } = params
  const userUuid = await UserRepository.getInvitedUserUuidByResetPasswordUuid(invitationUuid, client)
  if (!userUuid) return error(ExternalLoginErrorKeys.invitationInvalid)
  if (!isEmailDomainAllowed(provider, identity)) return error(ExternalLoginErrorKeys.emailDomainNotAllowed)

  const existing = await UserExternalIdentityRepository.getByIssuerAndSubject(identity, client)
  if (existing && existing.userUuid !== userUuid) return error(ExternalLoginErrorKeys.identityAlreadyLinked)
  if (!existing) {
    const linkError = await linkIdentity({ ...params, userUuid }, client)
    if (linkError) return error(linkError)
  }
  if (!dryRun) {
    await UserRepository.acceptInvitationExternal({ userUuid, name: name || identity.name }, client)
  }
  return { userUuid, linked: !existing, accepted: true }
}

/**
 * Link mode: a logged-in user links the identity to their account; no email match is needed.
 */
const resolveLink = async (
  params: ResolveParams & { userUuid: string },
  client: BaseProtocol
): Promise<ExternalLoginResolution> => {
  const { provider, identity, userUuid } = params
  const existing = await UserExternalIdentityRepository.getByIssuerAndSubject(identity, client)
  if (existing) {
    return existing.userUuid === userUuid
      ? { userUuid, linked: false, accepted: false }
      : error(ExternalLoginErrorKeys.identityAlreadyLinked)
  }
  if (!isEmailDomainAllowed(provider, identity)) return error(ExternalLoginErrorKeys.emailDomainNotAllowed)
  const linkError = await linkIdentity(params, client)
  return linkError ? error(linkError) : { userUuid, linked: true, accepted: false }
}

export const ExternalLoginUserResolver = {
  resolveLogin: (params: ResolveParams, client: BaseProtocol = DB) => client.tx((tx) => resolveLogin(params, tx)),
  resolveInvitation: (params: ResolveParams & { invitationUuid: string; name?: string }, client: BaseProtocol = DB) =>
    client.tx((tx) => resolveInvitation(params, tx)),
  resolveLink: (params: ResolveParams & { userUuid: string }, client: BaseProtocol = DB) =>
    client.tx((tx) => resolveLink(params, tx)),
}
