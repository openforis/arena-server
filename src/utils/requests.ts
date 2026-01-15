import { Request } from 'express'
import { User } from '@openforis/arena-core'

const getParams = (req: Request): Record<string, any> => {
  const params = { ...req.query, ...req.params, ...req.body }
  return Object.entries(params).reduce<Record<string, any>>((paramsAcc, [key, value]) => {
    // Convert String boolean values to Boolean type
    paramsAcc[key] = value === 'true' || value === 'false' ? value === 'true' : value
    return paramsAcc
  }, {})
}
const getJsonParam =
  <T = unknown>(paramName: string, defaultValue: T | null = null) =>
  (req: Request): T | null => {
    const params = getParams(req)
    const jsonStr = params[paramName]
    if (jsonStr && typeof jsonStr === 'string') {
      try {
        return JSON.parse(jsonStr)
      } catch {
        return defaultValue
      }
    }
    if (jsonStr && typeof jsonStr === 'object') return jsonStr // already parsed to a JSON object
    return defaultValue
  }

const getArrayParam =
  <T = unknown>(paramName: string, defaultValue: T[] = []) =>
  (req: Request): T[] => {
    const params = getParams(req)
    const adaptedParamName = paramName.endsWith('[]') ? paramName : `${paramName}[]` // express query params for arrays end with []
    const param = (params[paramName] ?? params[adaptedParamName]) as T | T[] | null | undefined
    if (param === null || param === undefined) {
      return defaultValue
    }
    return Array.isArray(param) ? param : [param]
  }
const getServerUrl = (request: Request): string => `${request.protocol}://${request.get('host')}`
const getUrl = (request: Request): string => request.url
const getUser = (request: Request): User => request.user
const isHttps = (request: Request): boolean => request.secure || request.header('x-forwarded-proto') === 'https'

const getHeader =
  (name: string) =>
  (req: Request): string | string[] | undefined =>
    req.headers[name]

const getHost = (request: Request): string | undefined => getHeader('host')(request) as string | undefined

const getSocketId = (req: Request): string | undefined => getHeader('socketid')(req) as string | undefined

export const Requests = {
  getHost,
  getParams,
  getJsonParam,
  getArrayParam,
  getServerUrl,
  getUrl,
  getUser,
  isHttps,
  getHeader,
  getSocketId,
}
