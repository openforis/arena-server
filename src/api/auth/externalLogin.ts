import { CookieOptions, Express, Request, Response } from 'express'

import { ServiceRegistry, ServiceType, User, UserService, Users } from '@openforis/arena-core'

import { Logger } from '../../log'
import { AuthProviderWithSecret, ExternalIdentity } from '../../model'
import { NodeEnv, ProcessEnv } from '../../processEnv'
import { ExpressInitializer, ServerServiceType } from '../../server'
import { createLoginRateLimiters } from '../../server/middleware/loginRateLimit'
import { AuthProviderService, User2FAService } from '../../service'
import {
  ExternalLoginErrorKeys,
  ExternalLoginFlow,
  ExternalLoginMode,
  ExternalLoginResolution,
  ExternalLoginTokens,
  ExternalLoginUserResolver,
  getAdapter,
  randomFlowChecks,
} from '../../service/externalLogin'
import { Requests } from '../../utils'
import { ApiEndpoint } from '../endpoint'
import { ApiAuthMiddleware } from '../middleware'
import { createSessionTokens, sendUser } from './login'

const logger = new Logger('ExternalLoginAPI')

const cookiePath = '/auth/oidc'
const flowCookieName = 'externalLoginFlow'
const pendingTwoFactorCookieName = 'externalLoginPending2FA'
const testResultCookieName = 'externalLoginTestResult'

const paths = {
  loginSuccess: '/app/home/',
  login: '/guest/login/',
  invitation: (invitationUuid: string) => `/guest/resetPassword/${invitationUuid}/`,
}

// only relative app paths, to avoid open redirects
const returnToRegExp = /^\/app\/[\w/-]{0,200}$/
const uuidRegExp = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const getAuthProviderService = (): AuthProviderService =>
  ServiceRegistry.getInstance().getService(ServerServiceType.authProvider) as AuthProviderService

const getUser2FAService = (): User2FAService =>
  ServiceRegistry.getInstance().getService(ServerServiceType.user2FA) as User2FAService

const getUserService = (): UserService => ServiceRegistry.getInstance().getService(ServiceType.user) as UserService

const cookieOptions = (maxAge: number): CookieOptions => ({
  httpOnly: true,
  secure: ProcessEnv.nodeEnv === NodeEnv.production || ProcessEnv.useHttps,
  // lax: the callback is a cross-site top-level navigation coming from the provider
  sameSite: 'lax',
  path: cookiePath,
  maxAge,
})

const getBaseUrl = (req: Request): string =>
  ProcessEnv.arenaPublicUrl || `${Requests.isHttps(req) ? 'https' : 'http'}://${req.get('host')}`

const withQuery = (path: string, query: Record<string, string>): string => `${path}?${new URLSearchParams(query)}`

// disabled providers can still be tested by system admins
const getUsableProvider = async (
  providerId: string,
  mode?: ExternalLoginMode
): Promise<AuthProviderWithSecret | null> => {
  const provider = await getAuthProviderService().getWithSecret(providerId)
  if (!provider?.clientSecret) return null
  return provider.enabled || mode === ExternalLoginMode.test ? provider : null
}

const getErrorRedirect = (flow: Partial<ExternalLoginFlow> | null, errorKey: string): string => {
  const query = { externalLoginError: errorKey }
  if (flow?.returnTo) return withQuery(flow.returnTo, query)
  if (flow?.invitationUuid) return withQuery(paths.invitation(flow.invitationUuid), query)
  return withQuery(paths.login, query)
}

// ===== start

const getStartMode = (
  req: Request,
  providerId: string
): { mode: ExternalLoginMode; userUuid?: string; invitationUuid?: string } | null => {
  const { ticket, invitation } = Requests.getParams(req)
  if (ticket) {
    const verified = ExternalLoginTokens.verifyTicket(ticket)
    if (verified?.providerId !== providerId) return null
    return { mode: verified.mode, userUuid: verified.userUuid }
  }
  if (invitation) {
    return uuidRegExp.test(invitation) ? { mode: ExternalLoginMode.invitation, invitationUuid: invitation } : null
  }
  return { mode: ExternalLoginMode.login }
}

const getReturnTo = (req: Request, mode: ExternalLoginMode): string | undefined => {
  const { returnTo } = Requests.getParams(req)
  const isUserFlow = mode === ExternalLoginMode.link || mode === ExternalLoginMode.test
  return isUserFlow && typeof returnTo === 'string' && returnToRegExp.test(returnTo) ? returnTo : undefined
}

const handleStart = async (req: Request, res: Response): Promise<void> => {
  const { providerId } = req.params as { providerId: string }
  const startMode = getStartMode(req, providerId)
  const provider = startMode ? await getUsableProvider(providerId, startMode.mode) : null
  if (!provider || !startMode) {
    res.redirect(getErrorRedirect(null, ExternalLoginErrorKeys.providerNotAvailable))
    return
  }
  const { name } = Requests.getParams(req)
  const flow: ExternalLoginFlow = {
    ...randomFlowChecks(),
    ...startMode,
    providerId,
    redirectUri: getAuthProviderService().getRedirectUri(providerId, getBaseUrl(req)),
    returnTo: getReturnTo(req, startMode.mode),
    name: typeof name === 'string' ? name.trim().substring(0, 100) || undefined : undefined,
  }
  try {
    const url = await getAdapter(provider).buildAuthorizationUrl({
      provider,
      redirectUri: flow.redirectUri,
      checks: flow,
    })
    res.cookie(
      flowCookieName,
      ExternalLoginTokens.signFlow(flow),
      cookieOptions(ExternalLoginTokens.maxAgeMsByKind.flow)
    )
    res.redirect(url.href)
  } catch (error: any) {
    logger.error(`external login start failed for provider "${providerId}": ${error.message}`)
    res.redirect(getErrorRedirect(flow, ExternalLoginErrorKeys.providerNotAvailable))
  }
}

// ===== callback

const resolveUser = (
  flow: ExternalLoginFlow,
  provider: AuthProviderWithSecret,
  identity: ExternalIdentity
): Promise<ExternalLoginResolution> => {
  if (flow.mode === ExternalLoginMode.invitation) {
    return ExternalLoginUserResolver.resolveInvitation({
      provider,
      identity,
      invitationUuid: flow.invitationUuid!,
      name: flow.name,
    })
  }
  if (flow.mode === ExternalLoginMode.link) {
    return ExternalLoginUserResolver.resolveLink({ provider, identity, userUuid: flow.userUuid! })
  }
  return ExternalLoginUserResolver.resolveLogin({ provider, identity, dryRun: flow.mode === ExternalLoginMode.test })
}

const completeTestFlow = async (
  res: Response,
  flow: ExternalLoginFlow,
  identity: ExternalIdentity,
  resolution: ExternalLoginResolution
): Promise<void> => {
  const matchingUser = 'userUuid' in resolution ? await getUserService().get({ userUuid: resolution.userUuid }) : null
  const result = {
    providerId: flow.providerId,
    identity,
    // alreadyLinked: the identity is linked; otherwise it would be linked by email at the first sign-in
    resolution: 'errorKey' in resolution ? { errorKey: resolution.errorKey } : { alreadyLinked: !resolution.linked },
    matchingUser: matchingUser
      ? { uuid: matchingUser.uuid, name: matchingUser.name, email: matchingUser.email, status: matchingUser.status }
      : null,
  }
  res.cookie(
    testResultCookieName,
    ExternalLoginTokens.signTestResult(result),
    cookieOptions(ExternalLoginTokens.maxAgeMsByKind.testResult)
  )
  res.redirect(withQuery(flow.returnTo ?? '/app/home/', { externalLoginTest: flow.providerId }))
}

const isTwoFactorRequired = async (provider: AuthProviderWithSecret, userUuid: string): Promise<boolean> =>
  provider.requireArena2FA && getUser2FAService().hasEnabledDevices({ userUuid })

const completeLogin = async (
  req: Request,
  res: Response,
  provider: AuthProviderWithSecret,
  userUuid: string
): Promise<void> => {
  if (await isTwoFactorRequired(provider, userUuid)) {
    const pending = ExternalLoginTokens.signPendingTwoFactor({ userUuid, providerId: provider.id })
    res.cookie(pendingTwoFactorCookieName, pending, cookieOptions(ExternalLoginTokens.maxAgeMsByKind.pendingTwoFactor))
    res.redirect(withQuery(paths.login, { externalLoginStep: '2fa', provider: provider.id }))
    return
  }
  await createSessionTokens({ req, res, userUuid })
  res.redirect(paths.loginSuccess)
}

const handleCallbackWithFlow = async (req: Request, res: Response, flow: ExternalLoginFlow): Promise<void> => {
  const provider = await getUsableProvider(flow.providerId, flow.mode)
  if (!provider) {
    res.redirect(getErrorRedirect(flow, ExternalLoginErrorKeys.providerNotAvailable))
    return
  }
  let identity: ExternalIdentity
  try {
    const currentUrl = new URL(req.originalUrl, flow.redirectUri)
    identity = await getAdapter(provider).handleCallback({ provider, currentUrl, checks: flow })
  } catch (error: any) {
    logger.error(`external login callback failed for provider "${provider.id}": ${error.message}`)
    res.redirect(getErrorRedirect(flow, ExternalLoginErrorKeys.providerError))
    return
  }
  const resolution = await resolveUser(flow, provider, identity)
  if (flow.mode === ExternalLoginMode.test) {
    await completeTestFlow(res, flow, identity, resolution)
  } else if ('errorKey' in resolution) {
    logger.info(`external login refused (provider "${provider.id}"): ${resolution.errorKey}`)
    res.redirect(getErrorRedirect(flow, resolution.errorKey))
  } else if (flow.mode === ExternalLoginMode.link) {
    res.redirect(withQuery(flow.returnTo ?? '/app/home/', { externalLoginLinked: provider.id }))
  } else {
    await completeLogin(req, res, provider, resolution.userUuid)
  }
}

const handleCallback = async (req: Request, res: Response): Promise<void> => {
  const { providerId } = req.params as { providerId: string }
  const flow = ExternalLoginTokens.verifyFlow(req.cookies?.[flowCookieName])
  res.clearCookie(flowCookieName, { path: cookiePath })
  if (flow?.providerId !== providerId) {
    res.redirect(getErrorRedirect(flow, ExternalLoginErrorKeys.flowInvalid))
    return
  }
  await handleCallbackWithFlow(req, res, flow)
}

// ===== 2FA, tickets, test result

const handleTwoFactor = async (req: Request, res: Response): Promise<void> => {
  const pending = ExternalLoginTokens.verifyPendingTwoFactor(req.cookies?.[pendingTwoFactorCookieName])
  if (!pending) {
    res.status(401).json({ message: ExternalLoginErrorKeys.flowInvalid })
    return
  }
  const { twoFactorToken } = Requests.getParams(req)
  const { userUuid } = pending
  const valid = Boolean(twoFactorToken) && (await getUser2FAService().verifyLogin({ userUuid, token: twoFactorToken }))
  if (!valid) {
    res.status(401).json({ message: ExternalLoginErrorKeys.invalidTwoFactorCode })
    return
  }
  res.clearCookie(pendingTwoFactorCookieName, { path: cookiePath })
  const user = (await getUserService().get({ userUuid })) as User
  const authToken = await createSessionTokens({ req, res, userUuid })
  await sendUser({ req, res, user, authToken })
}

const handleTicket = async (req: Request, res: Response): Promise<void> => {
  const { providerId } = req.params as { providerId: string }
  const { mode } = Requests.getParams(req)
  const user = Requests.getUser(req)
  const isTest = mode === ExternalLoginMode.test
  if (isTest && !Users.isSystemAdmin(user)) {
    res.status(403).json({ message: 'appErrors.userNotAuthorized' })
    return
  }
  const ticket = ExternalLoginTokens.signTicket({
    userUuid: user.uuid,
    providerId,
    mode: isTest ? ExternalLoginMode.test : ExternalLoginMode.link,
  })
  res.json({ ticket })
}

const handleTestResult = (req: Request, res: Response): void => {
  const result = ExternalLoginTokens.verifyTestResult(req.cookies?.[testResultCookieName])
  res.clearCookie(testResultCookieName, { path: cookiePath })
  if (result) {
    res.json(result)
  } else {
    res.status(404).json({ message: ExternalLoginErrorKeys.flowInvalid })
  }
}

const handleProviders = async (_req: Request, res: Response): Promise<void> => {
  res.json(await getAuthProviderService().getForLogin())
}

const handleProviderIcon = async (req: Request, res: Response): Promise<void> => {
  const { providerId } = req.params as { providerId: string }
  const provider = await getAuthProviderService().get(providerId)
  const icon = provider?.enabled ? await getAuthProviderService().getIcon(providerId) : null
  if (!icon) {
    res.status(404).end()
    return
  }
  res.set('Content-Type', icon.mime)
  // uploaded SVGs are sanitized on upload; the policy is an extra guard when the icon is opened directly
  res.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox")
  res.set('Cache-Control', 'public, max-age=300')
  res.send(icon.file)
}

const asyncHandler =
  (handler: (req: Request, res: Response) => Promise<void> | void) =>
  async (req: Request, res: Response, next: (error?: unknown) => void): Promise<void> => {
    try {
      await handler(req, res)
    } catch (error) {
      next(error)
    }
  }

export const ExternalLoginApi: ExpressInitializer = {
  init: (express: Express): void => {
    const loginRateLimiters = ProcessEnv.loginRateLimitEnabled ? createLoginRateLimiters() : []
    express.get(ApiEndpoint.auth.externalLoginProviders(), asyncHandler(handleProviders))
    express.get(ApiEndpoint.auth.externalLoginProviderIcon(':providerId'), asyncHandler(handleProviderIcon))
    // fixed paths first: they would otherwise match the provider id parameter
    express.post(ApiEndpoint.auth.externalLoginTwoFactor(), ...loginRateLimiters, asyncHandler(handleTwoFactor))
    express.get(
      ApiEndpoint.auth.externalLoginTestResult(),
      ApiAuthMiddleware.requireAdminPermission,
      asyncHandler(handleTestResult)
    )
    express.get(ApiEndpoint.auth.externalLoginStart(':providerId'), asyncHandler(handleStart))
    express.get(ApiEndpoint.auth.externalLoginCallback(':providerId'), asyncHandler(handleCallback))
    express.post(ApiEndpoint.auth.externalLoginTicket(':providerId'), asyncHandler(handleTicket))
  },
}
