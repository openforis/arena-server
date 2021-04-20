import { Request } from 'express'

const getHost = (request: Request): string | undefined => request.header('host')
const getParams = (req: Request): Record<string, any> => {
  const params = { ...req.query, ...req.params, ...req.body }
  return Object.entries(params).reduce<Record<string, any>>((paramsAcc, [key, value]) => {
    // Convert String boolean values to Boolean type
    paramsAcc[key] = value === 'true' || value === 'false' ? value === 'true' : value
    return paramsAcc
  }, {})
}

const getServerUrl = (request: Request): string => `${request.protocol}://${request.get('host')}`
const getUrl = (request: Request): string => request.url
const getUser = (request: Request) => request.user
const isHttps = (request: Request): boolean => request.secure || request.header('x-forwarded-proto') === 'https'

export const Requests = {
  getHost,
  getParams,
  getServerUrl,
  getUrl,
  getUser,
  isHttps,
}
